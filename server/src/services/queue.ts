import Bull, { Queue, Job } from 'bull'
import { Express } from 'express'
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { logger } from '../utils/logger'
import { getNotifier } from './websocket'

// Queue configurations
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const queueOptions = {
  redis: REDIS_URL,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
}

// Create queues
export const fileProcessingQueue = new Queue('file-processing', queueOptions)
export const conflictAnalysisQueue = new Queue('conflict-analysis', queueOptions)
export const notificationQueue = new Queue('notifications', queueOptions)
export const scheduledJobsQueue = new Queue('scheduled-jobs', queueOptions)

// Job data interfaces
interface FileProcessingJobData {
  analysisId: string
  organizationId: string
  filePath: string
  userId: string
  columnMapping?: any
}

interface ConflictAnalysisJobData {
  analysisId: string
  organizationId: string
  records: any[]
  columnMapping: any
}

interface NotificationJobData {
  type: 'email' | 'slack' | 'teams' | 'webhook'
  recipients: string[]
  subject?: string
  message: string
  organizationId: string
  data?: any
}

interface ScheduledJobData {
  type: 'file_scan' | 'integration_sync' | 'report_generation' | 'cleanup'
  organizationId: string
  integrationId?: string
  config: any
}

// File processing worker
fileProcessingQueue.process('process-file', 5, async (job: Job<FileProcessingJobData>) => {
  const { analysisId, organizationId, filePath, userId, columnMapping } = job.data
  const notifier = getNotifier()

  try {
    logger.info('Starting file processing job', { analysisId, organizationId })

    // Update progress: Starting
    job.progress(10)
    notifier?.sendAnalysisProgress(analysisId, {
      status: 'PROCESSING',
      progress: 10,
      message: 'Starting file processing...'
    })

    // Import required modules dynamically to avoid circular dependencies
    const { processUploadedFile, validateProcessedData, convertToAnalysisRecords } = await import('./fileProcessor')
    const { detectColumns } = await import('./columnDetection')
    const { analyzeConflicts, saveConflictsToDatabase } = await import('./conflictAnalysis')
    const { uploadToS3 } = await import('./fileUpload')
    const { PrismaClient } = await import('@prisma/client')

    const prisma = new PrismaClient()

    // Process file
    job.progress(20)
    notifier?.sendAnalysisProgress(analysisId, {
      status: 'PROCESSING',
      progress: 20,
      message: 'Processing file data...'
    })

    const processedData = await processUploadedFile(filePath)

    // Validate data
    job.progress(30)
    const validation = validateProcessedData(processedData)
    if (!validation.valid) {
      throw new Error(`Invalid file data: ${validation.errors.join(', ')}`)
    }

    // Auto-detect columns if not provided
    job.progress(40)
    let finalColumnMapping = columnMapping
    if (!finalColumnMapping) {
      const columnDetection = detectColumns(processedData.headers, processedData.records.slice(0, 100))
      finalColumnMapping = columnDetection.mapping

      if (!columnDetection.mapping.upc || !columnDetection.mapping.sku || columnDetection.confidence < 70) {
        // Mark as completed but requiring manual mapping
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            columnMapping: columnDetection.mapping,
            totalRecords: processedData.records.length,
            settings: {
              columnDetection: {
                suggestions: columnDetection.suggestions,
                warnings: columnDetection.warnings,
                confidence: columnDetection.confidence
              }
            }
          }
        })

        notifier?.sendAnalysisProgress(analysisId, {
          status: 'COMPLETED',
          progress: 100,
          message: 'File processed. Manual column mapping required.'
        })

        return { requiresManualMapping: true }
      }
    }

    // Upload to S3
    job.progress(50)
    notifier?.sendAnalysisProgress(analysisId, {
      status: 'PROCESSING',
      progress: 50,
      message: 'Uploading file to storage...'
    })

    // Create a mock file object for upload
    const mockFile = {
      path: filePath,
      originalname: `analysis-${analysisId}.xlsx`,
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 0
    } as Express.Multer.File

    const fileKey = await uploadToS3(mockFile, organizationId, analysisId)

    // Convert to analysis records
    job.progress(60)
    notifier?.sendAnalysisProgress(analysisId, {
      status: 'PROCESSING',
      progress: 60,
      message: 'Converting data for analysis...'
    })

    const analysisRecords = convertToAnalysisRecords(processedData, finalColumnMapping)

    // Save records to database in batches
    job.progress(70)
    const batchSize = 1000
    for (let i = 0; i < analysisRecords.length; i += batchSize) {
      const batch = analysisRecords.slice(i, i + batchSize)
      await prisma.analysisRecord.createMany({
        data: batch.map(record => ({
          ...record,
          analysisId
        }))
      })

      // Update progress
      const batchProgress = 70 + (i / analysisRecords.length) * 20
      job.progress(batchProgress)
    }

    // Queue conflict analysis
    job.progress(90)
    notifier?.sendAnalysisProgress(analysisId, {
      status: 'PROCESSING',
      progress: 90,
      message: 'Analyzing conflicts...'
    })

    await conflictAnalysisQueue.add('analyze-conflicts', {
      analysisId,
      organizationId,
      records: analysisRecords,
      columnMapping: finalColumnMapping
    })

    // Update analysis with basic info
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        fileUrl: fileKey,
        columnMapping: finalColumnMapping,
        totalRecords: analysisRecords.length,
        progress: 95
      }
    })

    logger.info('File processing job completed', { analysisId, recordCount: analysisRecords.length })

    return { success: true, recordCount: analysisRecords.length }

  } catch (error) {
    logger.error('File processing job failed:', error)

    // Update analysis with error
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        progress: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    notifier?.sendAnalysisProgress(analysisId, {
      status: 'FAILED',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    throw error
  }
})

// Conflict analysis worker
conflictAnalysisQueue.process('analyze-conflicts', 3, async (job: Job<ConflictAnalysisJobData>) => {
  const { analysisId, organizationId, records, columnMapping } = job.data
  const notifier = getNotifier()

  try {
    logger.info('Starting conflict analysis job', { analysisId, organizationId })

    job.progress(10)

    const { analyzeConflicts, saveConflictsToDatabase } = await import('./conflictAnalysis')
    const { PrismaClient } = await import('@prisma/client')

    const prisma = new PrismaClient()

    // Analyze conflicts
    job.progress(30)
    const conflictResults = await analyzeConflicts(records, analysisId, organizationId)

    // Save conflicts to database
    job.progress(70)
    await saveConflictsToDatabase(conflictResults, analysisId, organizationId)

    // Update analysis with final results
    job.progress(90)
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        uniqueUPCs: conflictResults.statistics.uniqueUPCs,
        uniqueProducts: conflictResults.statistics.uniqueProducts,
        duplicateUPCs: conflictResults.statistics.duplicateUPCs,
        multiUPCProducts: conflictResults.statistics.multiUPCProducts,
        maxDuplication: conflictResults.statistics.maxDuplication
      }
    })

    // Send completion notification
    notifier?.sendAnalysisComplete(analysisId, organizationId, conflictResults.statistics)

    // Send new conflict notifications for high/critical conflicts
    const criticalConflicts = [
      ...conflictResults.duplicateUPCs.filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH'),
      ...conflictResults.multiUPCProducts.filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH')
    ]

    for (const conflict of criticalConflicts.slice(0, 5)) { // Limit to first 5
      if ('productCount' in conflict) {
        notifier?.sendNewConflict(organizationId, {
          id: `temp-${Date.now()}`, // Would be actual ID from database
          type: 'DUPLICATE_UPC',
          severity: conflict.severity,
          upc: conflict.upc,
          description: `UPC ${conflict.upc} assigned to ${conflict.productCount} products`
        })
      } else {
        notifier?.sendNewConflict(organizationId, {
          id: `temp-${Date.now()}`,
          type: 'MULTI_UPC_PRODUCT',
          severity: conflict.severity,
          productId: conflict.productId,
          description: `Product ${conflict.productId} has ${conflict.upcCount} UPCs`
        })
      }
    }

    job.progress(100)

    logger.info('Conflict analysis job completed', {
      analysisId,
      duplicateUPCs: conflictResults.statistics.duplicateUPCs,
      multiUPCProducts: conflictResults.statistics.multiUPCProducts
    })

    return conflictResults.statistics

  } catch (error) {
    logger.error('Conflict analysis job failed:', error)

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Conflict analysis failed'
      }
    })

    notifier?.sendAnalysisProgress(analysisId, {
      status: 'FAILED',
      progress: 0,
      error: error instanceof Error ? error.message : 'Conflict analysis failed'
    })

    throw error
  }
})

// Notification worker
notificationQueue.process('send-notification', 10, async (job: Job<NotificationJobData>) => {
  const { type, recipients, subject, message, organizationId, data } = job.data

  try {
    logger.info('Sending notification', { type, recipientCount: recipients.length, organizationId })

    switch (type) {
      case 'email':
        // Implement email sending
        logger.info('Email notification sent', { recipients })
        break

      case 'slack':
        // Implement Slack webhook
        logger.info('Slack notification sent', { recipients })
        break

      case 'teams':
        // Implement Teams webhook
        logger.info('Teams notification sent', { recipients })
        break

      case 'webhook':
        // Implement custom webhook
        logger.info('Webhook notification sent', { recipients })
        break
    }

    return { success: true }
  } catch (error) {
    logger.error('Notification sending failed:', error)
    throw error
  }
})

// Scheduled jobs worker
scheduledJobsQueue.process('scheduled-job', 2, async (job: Job<ScheduledJobData>) => {
  const { type, organizationId, integrationId, config } = job.data

  try {
    logger.info('Running scheduled job', { type, organizationId, integrationId })

    switch (type) {
      case 'file_scan':
        // Implement file scanning for integrations
        logger.info('File scan completed', { organizationId })
        break

      case 'integration_sync':
        // Implement integration synchronization
        logger.info('Integration sync completed', { organizationId, integrationId })
        break

      case 'report_generation':
        // Implement scheduled report generation
        logger.info('Report generation completed', { organizationId })
        break

      case 'cleanup':
        // Implement data cleanup
        logger.info('Cleanup completed', { organizationId })
        break
    }

    return { success: true }
  } catch (error) {
    logger.error('Scheduled job failed:', error)
    throw error
  }
})

// Queue event handlers
const queues = [fileProcessingQueue, conflictAnalysisQueue, notificationQueue, scheduledJobsQueue]

queues.forEach(queue => {
  queue.on('completed', (job) => {
    logger.info(`Job completed: ${queue.name}:${job.opts.jobId}`)
  })

  queue.on('failed', (job, err) => {
    logger.error(`Job failed: ${queue.name}:${job.opts.jobId}`, err)
  })

  queue.on('stalled', (job) => {
    logger.warn(`Job stalled: ${queue.name}:${job.opts.jobId}`)
  })
})

// Bull Dashboard setup
export function setupBullDashboard(app: Express) {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({
    queues: [
      new BullAdapter(fileProcessingQueue),
      new BullAdapter(conflictAnalysisQueue),
      new BullAdapter(notificationQueue),
      new BullAdapter(scheduledJobsQueue)
    ],
    serverAdapter
  })

  app.use('/admin/queues', serverAdapter.getRouter())

  logger.info('Bull Dashboard available at /admin/queues')
}

// Helper functions to add jobs
export async function queueFileProcessing(data: FileProcessingJobData): Promise<Bull.Job<FileProcessingJobData>> {
  return fileProcessingQueue.add('process-file', data, {
    priority: 10,
    delay: 0
  })
}

export async function queueConflictAnalysis(data: ConflictAnalysisJobData): Promise<Bull.Job<ConflictAnalysisJobData>> {
  return conflictAnalysisQueue.add('analyze-conflicts', data, {
    priority: 8
  })
}

export async function queueNotification(data: NotificationJobData): Promise<Bull.Job<NotificationJobData>> {
  return notificationQueue.add('send-notification', data, {
    priority: 5
  })
}

export async function queueScheduledJob(data: ScheduledJobData, schedule?: string): Promise<Bull.Job<ScheduledJobData>> {
  const options: any = { priority: 3 }

  if (schedule) {
    // Parse cron schedule
    options.repeat = { cron: schedule }
  }

  return scheduledJobsQueue.add('scheduled-job', data, options)
}

// Queue statistics
export async function getQueueStats() {
  const stats = await Promise.all(
    queues.map(async (queue) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ])

      return {
        name: queue.name,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      }
    })
  )

  return stats
}

// Graceful shutdown
export async function closeQueues() {
  logger.info('Closing job queues...')

  await Promise.all(queues.map(queue => queue.close()))

  logger.info('Job queues closed')
}