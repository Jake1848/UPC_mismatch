import express from 'express'
import { query, param, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// System-wide statistics (for platform admins)
router.get('/stats/system', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Only allow super admins (implement role check)
  if (req.user!.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    })
  }

  const [
    totalOrganizations,
    activeOrganizations,
    totalUsers,
    activeUsers,
    totalAnalyses,
    totalConflicts,
    subscriptionStats
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({
      where: { subscriptionStatus: { not: 'CANCELED' } }
    }),
    prisma.user.count(),
    prisma.user.count({
      where: { isActive: true }
    }),
    prisma.analysis.count(),
    prisma.conflict.count(),
    prisma.organization.groupBy({
      by: ['plan'],
      _count: { plan: true }
    })
  ])

  res.json({
    organizations: {
      total: totalOrganizations,
      active: activeOrganizations
    },
    users: {
      total: totalUsers,
      active: activeUsers
    },
    analyses: {
      total: totalAnalyses
    },
    conflicts: {
      total: totalConflicts
    },
    subscriptions: subscriptionStats.reduce((acc, stat) => {
      acc[stat.plan.toLowerCase()] = stat._count.plan
      return acc
    }, {} as Record<string, number>)
  })
}))

// Organization management
router.get('/organizations', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Only allow super admins
  if (req.user!.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    })
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const search = req.query.search as string

  const skip = (page - 1) * limit

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { billingEmail: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            analyses: true,
            conflicts: true
          }
        }
      }
    }),
    prisma.organization.count({ where })
  ])

  res.json({
    organizations: organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      createdAt: org.createdAt,
      counts: {
        activeUsers: org._count.users,
        totalAnalyses: org._count.analyses,
        totalConflicts: org._count.conflicts
      }
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}))

// Get organization details
router.get('/organizations/:id', [
  param('id').isString().withMessage('Organization ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Only allow super admins
  if (req.user!.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    })
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const organization = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          analyses: true,
          conflicts: true
        }
      }
    }
  })

  if (!organization) {
    throw createApiError('Organization not found', 404)
  }

  res.json(organization)
}))

// System health and monitoring
router.get('/health/detailed', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Only allow super admins
  if (req.user!.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    })
  }

  const [
    dbHealth,
    queueHealth,
    storageHealth,
    errorCount
  ] = await Promise.all([
    // Database health
    prisma.$queryRaw`SELECT 1`.then(() => ({ status: 'healthy' })).catch(err => ({ status: 'unhealthy', error: err.message })),

    // Queue health (mock for now)
    Promise.resolve({ status: 'healthy', pendingJobs: 0 }),

    // Storage health (mock for now)
    Promise.resolve({ status: 'healthy', usage: '45%' }),

    // Recent errors
    prisma.auditLog.count({
      where: {
        action: { contains: 'ERROR' },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
  ])

  res.json({
    database: dbHealth,
    queue: queueHealth,
    storage: storageHealth,
    errors: {
      last24Hours: errorCount
    },
    timestamp: new Date().toISOString()
  })
}))

// Recent activity across all organizations
router.get('/activity/recent', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Only allow super admins
  if (req.user!.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    })
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const limit = parseInt(req.query.limit as string) || 50

  const activities = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true }
      },
      organization: {
        select: { name: true, slug: true }
      }
    }
  })

  res.json({
    activities: activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      resource: activity.resource,
      details: activity.details,
      user: activity.user,
      organization: activity.organization,
      createdAt: activity.createdAt
    }))
  })
}))

// Performance metrics
router.get('/metrics/performance', [
  query('period').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid period'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Only allow super admins
  if (req.user!.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    })
  }

  const period = req.query.period as string || '24h'

  // Calculate time range
  const periodMap = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  }

  const hours = periodMap[period as keyof typeof periodMap]
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)

  const [
    analysesCreated,
    conflictsDetected,
    usersRegistered,
    averageProcessingTime
  ] = await Promise.all([
    prisma.analysis.count({
      where: { createdAt: { gte: startDate } }
    }),
    prisma.conflict.count({
      where: { createdAt: { gte: startDate } }
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate } }
    }),
    // Mock average processing time (would need to track this in real implementation)
    Promise.resolve(45.2)
  ])

  res.json({
    period,
    metrics: {
      analysesCreated,
      conflictsDetected,
      usersRegistered,
      averageProcessingTime
    },
    timestamp: new Date().toISOString()
  })
}))

export default router