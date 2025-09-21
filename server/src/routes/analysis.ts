import express from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { requireAnalyst, AuthenticatedRequest } from '../middleware/auth'
import { uploadMiddleware, uploadToS3, deleteFromS3, validateFile } from '../services/fileUpload'
import { processUploadedFile, validateProcessedData, convertToAnalysisRecords } from '../services/fileProcessor'
import { detectColumns, validateColumnMapping } from '../services/columnDetection'
import { analyzeConflicts, saveConflictsToDatabase } from '../services/conflictAnalysis'
import { aiAnalysisService } from '../services/aiAnalysis'
import { logger, logAudit, logPerformance } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// Get all analyses for organization
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).withMessage('Invalid status'),
  query('search').optional().isString().withMessage('Search must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const status = req.query.status as string
  const search = req.query.search as string

  const skip = (page - 1) * limit

  // Build where clause
  const where: any = {
    organizationId: req.user!.organizationId
  }

  if (status) {
    where.status = status
  }

  if (search) {
    where.OR = [
      { fileName: { contains: search, mode: 'insensitive' } },
      { originalName: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [analyses, total] = await Promise.all([
    prisma.analysis.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            conflicts: true
          }
        }
      }
    }),
    prisma.analysis.count({ where })
  ])

  res.json({
    analyses: analyses.map(analysis => ({
      id: analysis.id,
      fileName: analysis.fileName,
      originalName: analysis.originalName,
      status: analysis.status,
      progress: analysis.progress,
      totalRecords: analysis.totalRecords,
      uniqueUPCs: analysis.uniqueUPCs,
      uniqueProducts: analysis.uniqueProducts,
      duplicateUPCs: analysis.duplicateUPCs,
      multiUPCProducts: analysis.multiUPCProducts,
      maxDuplication: analysis.maxDuplication,
      conflictCount: analysis._count.conflicts,
      uploadedBy: analysis.uploadedBy,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
      errorMessage: analysis.errorMessage
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}))

// Get specific analysis
router.get('/:id', [
  param('id').isString().withMessage('Analysis ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      conflicts: {
        select: {
          id: true,
          type: true,
          severity: true,
          status: true
        }
      }
    }
  })

  if (!analysis) {
    throw createApiError('Analysis not found', 404)
  }

  res.json({
    id: analysis.id,
    fileName: analysis.fileName,
    originalName: analysis.originalName,
    fileSize: analysis.fileSize,
    fileMimeType: analysis.fileMimeType,
    status: analysis.status,
    progress: analysis.progress,
    totalRecords: analysis.totalRecords,
    uniqueUPCs: analysis.uniqueUPCs,
    uniqueProducts: analysis.uniqueProducts,
    duplicateUPCs: analysis.duplicateUPCs,
    multiUPCProducts: analysis.multiUPCProducts,
    maxDuplication: analysis.maxDuplication,
    columnMapping: analysis.columnMapping,
    settings: analysis.settings,
    uploadedBy: analysis.uploadedBy,
    conflicts: analysis.conflicts,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
    errorMessage: analysis.errorMessage
  })
}))

// Upload and analyze file
router.post('/upload', requireAnalyst, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Handle file upload
  uploadMiddleware(req, res, async (error) => {
    if (error) {
      logger.error('File upload error:', error)
      return res.status(400).json({
        error: 'File upload failed',
        message: error.message
      })
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      })
    }

    const startTime = Date.now()

    try {
      // Validate file
      const validation = validateFile(req.file)
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid file',
          message: validation.error
        })
      }

      // Create analysis record
      const analysis = await prisma.analysis.create({
        data: {
          fileName: `${Date.now()}-${req.file.originalname}`,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          fileMimeType: req.file.mimetype,
          fileUrl: '', // Will be updated after S3 upload
          status: 'PROCESSING',
          progress: 10,
          organizationId: req.user!.organizationId,
          uploadedById: req.user!.id,
          columnMapping: {},
          settings: req.body.settings ? JSON.parse(req.body.settings) : {}
        }
      })

      logAudit('ANALYSIS_STARTED', req.user!.id, req.user!.organizationId, {
        analysisId: analysis.id,
        fileName: req.file.originalname,
        fileSize: req.file.size
      })

      // Process file in background
      processFileInBackground(req.file, analysis.id, req.user!.organizationId)

      res.status(201).json({
        message: 'File uploaded successfully, processing started',
        analysis: {
          id: analysis.id,
          fileName: analysis.fileName,
          originalName: analysis.originalName,
          status: analysis.status,
          progress: analysis.progress,
          createdAt: analysis.createdAt
        }
      })
    } catch (error) {
      logger.error('Analysis creation error:', error)
      throw createApiError('Failed to create analysis', 500)
    }
  })
}))

// Update column mapping
router.patch('/:id/mapping', requireAnalyst, [
  param('id').isString().withMessage('Analysis ID is required'),
  body('columnMapping').isObject().withMessage('Column mapping is required'),
  body('columnMapping.upc').isString().withMessage('UPC column is required'),
  body('columnMapping.sku').isString().withMessage('SKU column is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { columnMapping } = req.body

  // Find analysis
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!analysis) {
    throw createApiError('Analysis not found', 404)
  }

  if (analysis.status !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Invalid status',
      message: 'Column mapping can only be updated for completed analyses'
    })
  }

  // Update column mapping
  const updatedAnalysis = await prisma.analysis.update({
    where: { id: analysis.id },
    data: {
      columnMapping,
      status: 'PROCESSING',
      progress: 50
    }
  })

  logAudit('COLUMN_MAPPING_UPDATED', req.user!.id, req.user!.organizationId, {
    analysisId: analysis.id,
    columnMapping
  })

  // Re-process with new mapping
  reprocessWithNewMapping(analysis.id, columnMapping, req.user!.organizationId)

  res.json({
    message: 'Column mapping updated, re-processing analysis',
    analysis: {
      id: updatedAnalysis.id,
      status: updatedAnalysis.status,
      progress: updatedAnalysis.progress,
      columnMapping: updatedAnalysis.columnMapping
    }
  })
}))

// Delete analysis
router.delete('/:id', requireAnalyst, [
  param('id').isString().withMessage('Analysis ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!analysis) {
    throw createApiError('Analysis not found', 404)
  }

  // Delete from S3 if file exists
  if (analysis.fileUrl) {
    try {
      await deleteFromS3(analysis.fileUrl)
    } catch (error) {
      logger.warn('Failed to delete file from S3:', error)
    }
  }

  // Delete analysis and related data
  await prisma.$transaction(async (tx) => {
    // Delete conflicts
    await tx.conflict.deleteMany({
      where: { analysisId: analysis.id }
    })

    // Delete analysis records
    await tx.analysisRecord.deleteMany({
      where: { analysisId: analysis.id }
    })

    // Delete analysis
    await tx.analysis.delete({
      where: { id: analysis.id }
    })
  })

  logAudit('ANALYSIS_DELETED', req.user!.id, req.user!.organizationId, {
    analysisId: analysis.id,
    fileName: analysis.fileName
  })

  res.json({
    message: 'Analysis deleted successfully'
  })
}))

// Background file processing function
async function processFileInBackground(
  file: Express.Multer.File,
  analysisId: string,
  organizationId: string
): Promise<void> {
  const startTime = Date.now()

  try {
    logger.info('Starting background file processing', {
      analysisId,
      fileName: file.originalname
    })

    // Update progress
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { progress: 20 }
    })

    // Process file
    const processedData = await processUploadedFile(file.path)

    // Update progress
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { progress: 40 }
    })

    // Validate data
    const validation = validateProcessedData(processedData)
    if (!validation.valid) {
      throw new Error(`Invalid file data: ${validation.errors.join(', ')}`)
    }

    // Auto-detect columns
    const columnDetection = detectColumns(processedData.headers, processedData.records.slice(0, 100))

    // Update progress
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { progress: 60 }
    })

    // Upload to S3
    const fileKey = await uploadToS3(file, organizationId, analysisId)

    // Update progress
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { progress: 80 }
    })

    // If we have good column mapping, proceed with analysis
    if (columnDetection.mapping.upc && columnDetection.mapping.sku && columnDetection.confidence > 70) {
      await performConflictAnalysis(analysisId, organizationId, processedData, columnDetection.mapping)
    } else {
      // Mark as completed but requiring manual mapping
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          fileUrl: fileKey,
          columnMapping: columnDetection.mapping,
          totalRecords: processedData.records.length,
          settings: {
            ...{},
            columnDetection: {
              suggestions: columnDetection.suggestions,
              warnings: columnDetection.warnings,
              confidence: columnDetection.confidence
            }
          }
        }
      })
    }

    const duration = Date.now() - startTime
    logPerformance('File processing', duration, {
      analysisId,
      recordCount: processedData.records.length
    })

  } catch (error) {
    logger.error('Background file processing failed:', error)

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        progress: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

// Conflict analysis function
async function performConflictAnalysis(
  analysisId: string,
  organizationId: string,
  processedData: any,
  columnMapping: any
): Promise<void> {
  try {
    // Convert to analysis records
    const analysisRecords = convertToAnalysisRecords(processedData, columnMapping)

    // Save records to database
    const batchSize = 1000
    for (let i = 0; i < analysisRecords.length; i += batchSize) {
      const batch = analysisRecords.slice(i, i + batchSize)
      await prisma.analysisRecord.createMany({
        data: batch.map(record => ({
          ...record,
          analysisId
        }))
      })
    }

    // Analyze conflicts
    const conflictResults = await analyzeConflicts(analysisRecords, analysisId, organizationId)

    // Save conflicts to database
    await saveConflictsToDatabase(conflictResults, analysisId, organizationId)

    // Update analysis with results
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        columnMapping,
        totalRecords: conflictResults.statistics.totalRecords,
        uniqueUPCs: conflictResults.statistics.uniqueUPCs,
        uniqueProducts: conflictResults.statistics.uniqueProducts,
        duplicateUPCs: conflictResults.statistics.duplicateUPCs,
        multiUPCProducts: conflictResults.statistics.multiUPCProducts,
        maxDuplication: conflictResults.statistics.maxDuplication
      }
    })

    logger.info('Conflict analysis completed', {
      analysisId,
      statistics: conflictResults.statistics
    })

  } catch (error) {
    logger.error('Conflict analysis failed:', error)
    throw error
  }
}

// Re-process with new mapping
async function reprocessWithNewMapping(
  analysisId: string,
  columnMapping: any,
  organizationId: string
): Promise<void> {
  try {
    // Get existing records
    const records = await prisma.analysisRecord.findMany({
      where: { analysisId }
    })

    if (records.length === 0) {
      throw new Error('No records found for analysis')
    }

    // Delete existing conflicts
    await prisma.conflict.deleteMany({
      where: { analysisId }
    })

    // Convert records to analysis format
    const analysisRecords = records.map(record => ({
      productId: record.productId,
      warehouseId: record.warehouseId,
      upc: record.upc,
      location: record.location
    }))

    // Analyze conflicts with new mapping
    const conflictResults = await analyzeConflicts(analysisRecords, analysisId, organizationId)

    // Save new conflicts
    await saveConflictsToDatabase(conflictResults, analysisId, organizationId)

    // Update analysis
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        columnMapping,
        duplicateUPCs: conflictResults.statistics.duplicateUPCs,
        multiUPCProducts: conflictResults.statistics.multiUPCProducts,
        maxDuplication: conflictResults.statistics.maxDuplication
      }
    })

  } catch (error) {
    logger.error('Re-processing failed:', error)

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Re-processing failed'
      }
    })
  }
}

export default router