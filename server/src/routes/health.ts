import express from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../middleware/errorHandler'
import { logger } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now()

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    const dbTime = Date.now() - startTime

    // Check Redis connection (if configured)
    let redisStatus = 'not_configured'
    let redisTime = 0

    if (process.env.REDIS_URL) {
      try {
        const Redis = require('ioredis')
        const redis = new Redis(process.env.REDIS_URL)
        const redisStart = Date.now()
        await redis.ping()
        redisTime = Date.now() - redisStart
        redisStatus = 'healthy'
        redis.disconnect()
      } catch (error) {
        redisStatus = 'unhealthy'
        logger.warn('Redis health check failed:', error)
      }
    }

    // Check AWS S3 connection (if configured)
    let s3Status = 'not_configured'
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3')
        const s3Client = new S3Client({
          region: process.env.AWS_REGION || 'us-east-1',
          ...(process.env.AWS_ENDPOINT && {
            endpoint: process.env.AWS_ENDPOINT,
            forcePathStyle: true
          })
        })

        await s3Client.send(new HeadBucketCommand({
          Bucket: process.env.AWS_S3_BUCKET
        }))
        s3Status = 'healthy'
      } catch (error) {
        s3Status = 'unhealthy'
        logger.warn('S3 health check failed:', error)
      }
    }

    const totalTime = Date.now() - startTime

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: {
          status: 'healthy',
          responseTime: `${dbTime}ms`
        },
        redis: {
          status: redisStatus,
          responseTime: redisStatus === 'healthy' ? `${redisTime}ms` : null
        },
        s3: {
          status: s3Status
        }
      },
      totalResponseTime: `${totalTime}ms`
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      responseTime: `${Date.now() - startTime}ms`
    })
  }
}))

// Detailed health check for monitoring systems
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  const checks: any = {}

  try {
    // Database check with query performance
    const dbStart = Date.now()
    const [userCount, orgCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count()
    ])
    checks.database = {
      status: 'healthy',
      responseTime: `${Date.now() - dbStart}ms`,
      metrics: {
        totalUsers: userCount,
        totalOrganizations: orgCount
      }
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  try {
    // Memory usage
    const memUsage = process.memoryUsage()
    checks.memory = {
      status: 'healthy',
      usage: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
      }
    }
  } catch (error) {
    checks.memory = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  try {
    // CPU usage (approximation)
    checks.cpu = {
      status: 'healthy',
      loadAverage: process.platform === 'win32' ? 'N/A (Windows)' : require('os').loadavg()
    }
  } catch (error) {
    checks.cpu = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const overallStatus = Object.values(checks).every(
    (check: any) => check.status === 'healthy'
  ) ? 'healthy' : 'degraded'

  const statusCode = overallStatus === 'healthy' ? 200 : 503

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())} seconds`,
    checks,
    totalResponseTime: `${Date.now() - startTime}ms`
  })
}))

// Readiness probe for Kubernetes
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // Check if application is ready to serve requests
    await prisma.$queryRaw`SELECT 1`

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Application not ready to serve requests'
    })
  }
}))

// Liveness probe for Kubernetes
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

export default router