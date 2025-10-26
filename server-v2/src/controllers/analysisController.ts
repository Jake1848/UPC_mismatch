import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { FileParser } from '../services/fileParser'
import { ConflictDetector } from '../services/conflictDetector'
import fs from 'fs/promises'

const prisma = new PrismaClient()
const fileParser = new FileParser()
const conflictDetector = new ConflictDetector()

interface AuthRequest extends Request {
  user?: {
    userId: string
    organizationId: string
  }
}

export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file
    const { userId, organizationId } = req.user!

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Validate file type
    const extension = file.originalname.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      // Clean up uploaded file
      await fs.unlink(file.path)
      return res.status(400).json({ error: 'Invalid file type. Only CSV and Excel files are supported.' })
    }

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        status: 'PROCESSING',
        userId,
        organizationId
      }
    })

    // Process file asynchronously
    processFileAsync(analysis.id, file.path, file.originalname, organizationId)
      .catch(error => {
        console.error('Error processing file:', error)
      })

    res.json({
      analysisId: analysis.id,
      status: 'PROCESSING',
      message: 'File uploaded successfully and is being processed'
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
}

async function processFileAsync(
  analysisId: string,
  filePath: string,
  fileName: string,
  organizationId: string
) {
  try {
    // Parse the file
    const rows = await fileParser.parseFile(filePath, fileName)

    // Detect conflicts
    const conflicts = conflictDetector.detectConflicts(rows)

    // Count conflicts by severity
    const severityCounts = {
      LOW: conflicts.filter(c => c.severity === 'LOW').length,
      MEDIUM: conflicts.filter(c => c.severity === 'MEDIUM').length,
      HIGH: conflicts.filter(c => c.severity === 'HIGH').length,
      CRITICAL: conflicts.filter(c => c.severity === 'CRITICAL').length
    }

    // Save conflicts to database
    const conflictRecords = conflicts.map(conflict => ({
      upc: conflict.upc,
      type: conflict.type,
      severity: conflict.severity,
      description: conflict.description,
      suggestedFix: conflict.suggestedFix,
      relatedRows: conflict.relatedRows || [],
      status: 'PENDING' as const,
      analysisId,
      organizationId
    }))

    // Use transaction to ensure data consistency
    await prisma.$transaction([
      // Create all conflicts
      prisma.conflict.createMany({
        data: conflictRecords
      }),
      // Update analysis status
      prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          totalRows: rows.length,
          conflictsFound: conflicts.length,
          processedAt: new Date(),
          lowSeverity: severityCounts.LOW,
          mediumSeverity: severityCounts.MEDIUM,
          highSeverity: severityCounts.HIGH,
          criticalSeverity: severityCounts.CRITICAL
        }
      })
    ])

    // Clean up uploaded file
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Processing error:', error)

    // Update analysis status to FAILED
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        processedAt: new Date()
      }
    })

    // Clean up file
    try {
      await fs.unlink(filePath)
    } catch (unlinkError) {
      console.error('Failed to delete file:', unlinkError)
    }
  }
}

export const getAllAnalyses = async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user!
    const { page = '1', limit = '10', status } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = { organizationId }
    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status as string)) {
      where.status = status
    }

    const [analyses, total] = await Promise.all([
      prisma.analysis.findMany({
        where,
        include: {
          user: {
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
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.analysis.count({ where })
    ])

    res.json({
      analyses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get analyses error:', error)
    res.status(500).json({ error: 'Failed to fetch analyses' })
  }
}

export const getAnalysisById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { organizationId } = req.user!

    const analysis = await prisma.analysis.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        conflicts: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 100 // Limit conflicts in initial load
        }
      }
    })

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    res.json({ analysis })
  } catch (error) {
    console.error('Get analysis error:', error)
    res.status(500).json({ error: 'Failed to fetch analysis' })
  }
}

export const deleteAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { organizationId } = req.user!

    // Check if analysis exists and belongs to organization
    const analysis = await prisma.analysis.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    // Delete analysis (conflicts will be cascade deleted)
    await prisma.analysis.delete({
      where: { id }
    })

    res.json({ message: 'Analysis deleted successfully' })
  } catch (error) {
    console.error('Delete analysis error:', error)
    res.status(500).json({ error: 'Failed to delete analysis' })
  }
}
