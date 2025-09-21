import express from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../middleware/errorHandler'
import { logger } from '../utils/logger'
import { cache } from '../utils/cache'
import { CircuitBreakerFactory } from '../utils/circuitBreaker'
import { db } from '../utils/database'

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

// Metrics endpoint for Prometheus
router.get('/metrics', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  const metrics: any = {}

  try {
    // Database metrics
    const dbStart = Date.now()
    const [userCount, orgCount, analysisCount, conflictCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.analysis.count(),
      prisma.conflict.count()
    ])
    const dbTime = Date.now() - dbStart

    metrics.database = {
      response_time_ms: dbTime,
      total_users: userCount,
      total_organizations: orgCount,
      total_analyses: analysisCount,
      total_conflicts: conflictCount
    }

    // Redis metrics
    if (await cache.ping()) {
      const cacheStats = await cache.getStats()
      metrics.redis = {
        connected: true,
        memory_usage: cacheStats?.memory || 'unknown'
      }
    } else {
      metrics.redis = { connected: false }
    }

    // Circuit breaker metrics
    const cbStats = CircuitBreakerFactory.getStats()
    metrics.circuit_breakers = cbStats

    // System metrics
    const memUsage = process.memoryUsage()
    metrics.system = {
      uptime_seconds: Math.floor(process.uptime()),
      memory_rss_bytes: memUsage.rss,
      memory_heap_used_bytes: memUsage.heapUsed,
      memory_heap_total_bytes: memUsage.heapTotal,
      memory_external_bytes: memUsage.external,
      cpu_load_average: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
    }

    // Convert to Prometheus format
    let prometheusMetrics = ''

    // Database metrics
    prometheusMetrics += `# HELP upc_resolver_db_response_time_ms Database response time in milliseconds\n`
    prometheusMetrics += `# TYPE upc_resolver_db_response_time_ms gauge\n`
    prometheusMetrics += `upc_resolver_db_response_time_ms ${metrics.database.response_time_ms}\n`

    prometheusMetrics += `# HELP upc_resolver_users_total Total number of users\n`
    prometheusMetrics += `# TYPE upc_resolver_users_total gauge\n`
    prometheusMetrics += `upc_resolver_users_total ${metrics.database.total_users}\n`

    prometheusMetrics += `# HELP upc_resolver_organizations_total Total number of organizations\n`
    prometheusMetrics += `# TYPE upc_resolver_organizations_total gauge\n`
    prometheusMetrics += `upc_resolver_organizations_total ${metrics.database.total_organizations}\n`

    prometheusMetrics += `# HELP upc_resolver_conflicts_total Total number of conflicts\n`
    prometheusMetrics += `# TYPE upc_resolver_conflicts_total gauge\n`
    prometheusMetrics += `upc_resolver_conflicts_total ${metrics.database.total_conflicts}\n`

    // System metrics
    prometheusMetrics += `# HELP upc_resolver_uptime_seconds Application uptime in seconds\n`
    prometheusMetrics += `# TYPE upc_resolver_uptime_seconds gauge\n`
    prometheusMetrics += `upc_resolver_uptime_seconds ${metrics.system.uptime_seconds}\n`

    prometheusMetrics += `# HELP upc_resolver_memory_rss_bytes RSS memory usage in bytes\n`
    prometheusMetrics += `# TYPE upc_resolver_memory_rss_bytes gauge\n`
    prometheusMetrics += `upc_resolver_memory_rss_bytes ${metrics.system.memory_rss_bytes}\n`

    prometheusMetrics += `# HELP upc_resolver_memory_heap_used_bytes Heap used memory in bytes\n`
    prometheusMetrics += `# TYPE upc_resolver_memory_heap_used_bytes gauge\n`
    prometheusMetrics += `upc_resolver_memory_heap_used_bytes ${metrics.system.memory_heap_used_bytes}\n`

    res.set('Content-Type', 'text/plain')
    res.send(prometheusMetrics)
  } catch (error) {
    logger.error('Metrics endpoint failed:', error)
    res.status(500).send('# Error generating metrics\n')
  }
}))

// Deep health check for critical services
router.get('/deep', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  const checks: any = {}
  let overallStatus = 'healthy'

  // Database deep check
  try {
    const dbStart = Date.now()
    await db.healthCheck()

    // Test complex query
    const recentAnalyses = await prisma.analysis.findMany({
      take: 1,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { conflicts: true }
        }
      }
    })

    checks.database = {
      status: 'healthy',
      responseTime: `${Date.now() - dbStart}ms`,
      details: {
        connectionPool: 'active',
        recentAnalyses: recentAnalyses.length,
        complexQueryTest: 'passed'
      }
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    overallStatus = 'unhealthy'
  }

  // Cache deep check
  try {
    const cacheStart = Date.now()

    // Test write/read/delete operations
    const testKey = `health_check_${Date.now()}`
    const testValue = { test: true, timestamp: Date.now() }

    await cache.set(testKey, testValue, 5)
    const retrieved = await cache.get(testKey)
    await cache.del(testKey)

    const cacheStats = await cache.getStats()

    checks.cache = {
      status: 'healthy',
      responseTime: `${Date.now() - cacheStart}ms`,
      details: {
        readWriteTest: retrieved ? 'passed' : 'failed',
        stats: cacheStats
      }
    }
  } catch (error) {
    checks.cache = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    if (overallStatus === 'healthy') overallStatus = 'degraded'
  }

  // File system check
  try {
    const fs = require('fs/promises')
    const os = require('os')

    const tempDir = os.tmpdir()
    const testFile = `${tempDir}/health_check_${Date.now()}.tmp`

    await fs.writeFile(testFile, 'health check test')
    const content = await fs.readFile(testFile, 'utf8')
    await fs.unlink(testFile)

    checks.filesystem = {
      status: 'healthy',
      details: {
        tempDirectory: tempDir,
        writeReadTest: content === 'health check test' ? 'passed' : 'failed'
      }
    }
  } catch (error) {
    checks.filesystem = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    if (overallStatus === 'healthy') overallStatus = 'degraded'
  }

  // Circuit breaker status
  try {
    const cbStats = CircuitBreakerFactory.getStats()
    const hasOpenCircuits = Object.values(cbStats).some((stats: any) =>
      stats.state === 'open' || stats.state === 'half-open'
    )

    checks.circuitBreakers = {
      status: hasOpenCircuits ? 'degraded' : 'healthy',
      details: cbStats
    }

    if (hasOpenCircuits && overallStatus === 'healthy') {
      overallStatus = 'degraded'
    }
  } catch (error) {
    checks.circuitBreakers = {
      status: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const statusCode = overallStatus === 'healthy' ? 200 :
                    overallStatus === 'degraded' ? 200 : 503

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks,
    totalResponseTime: `${Date.now() - startTime}ms`,
    recommendations: overallStatus !== 'healthy' ? [
      'Check logs for detailed error information',
      'Verify external service connectivity',
      'Monitor resource usage'
    ] : []
  })
}))

export default router