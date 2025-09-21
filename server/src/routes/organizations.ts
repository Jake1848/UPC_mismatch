import express from 'express'
import { body, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth'
import { logger, logAudit } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// Get organization details
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    include: {
      _count: {
        select: {
          users: { where: { isActive: true } },
          analyses: true,
          conflicts: true
        }
      }
    }
  })

  if (!organization) {
    throw createApiError('Organization not found', 404)
  }

  res.json({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    plan: organization.plan,
    subscriptionStatus: organization.subscriptionStatus,
    maxUsers: organization.maxUsers,
    maxProducts: organization.maxProducts,
    settings: organization.settings,
    trialEndsAt: organization.trialEndsAt,
    billingCycleAnchor: organization.billingCycleAnchor,
    createdAt: organization.createdAt,
    counts: {
      activeUsers: organization._count.users,
      totalAnalyses: organization._count.analyses,
      totalConflicts: organization._count.conflicts
    }
  })
}))

// Update organization settings
router.patch('/settings', requireAdmin, [
  body('settings').isObject().withMessage('Settings must be an object'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { settings } = req.body

  // Validate settings structure
  const allowedSettings = [
    'notifications',
    'analysis',
    'integrations',
    'security',
    'ui'
  ]

  for (const key of Object.keys(settings)) {
    if (!allowedSettings.includes(key)) {
      return res.status(400).json({
        error: 'Invalid setting',
        message: `Setting '${key}' is not allowed`
      })
    }
  }

  const organization = await prisma.organization.update({
    where: { id: req.user!.organizationId },
    data: { settings },
    select: {
      id: true,
      settings: true,
      updatedAt: true
    }
  })

  logAudit('ORGANIZATION_SETTINGS_UPDATED', req.user!.id, req.user!.organizationId, {
    updatedSettings: Object.keys(settings)
  })

  res.json({
    message: 'Organization settings updated successfully',
    organization
  })
}))

// Get organization members
router.get('/members', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const members = await prisma.user.findMany({
    where: { organizationId: req.user!.organizationId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  })

  res.json({ members })
}))

// Update member role (Admin only)
router.patch('/members/:userId/role', requireAdmin, [
  body('role').isIn(['ADMIN', 'ANALYST', 'VIEWER']).withMessage('Invalid role'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { userId } = req.params
  const { role } = req.body

  // Cannot change own role
  if (userId === req.user!.id) {
    return res.status(400).json({
      error: 'Cannot modify own role',
      message: 'You cannot change your own role'
    })
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId: req.user!.organizationId
    }
  })

  if (!user) {
    throw createApiError('User not found', 404)
  }

  // Ensure at least one admin remains
  if (user.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: {
        organizationId: req.user!.organizationId,
        role: 'ADMIN',
        isActive: true
      }
    })

    if (adminCount <= 1) {
      return res.status(400).json({
        error: 'Cannot remove last admin',
        message: 'Organization must have at least one admin'
      })
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  })

  logAudit('USER_ROLE_UPDATED', req.user!.id, req.user!.organizationId, {
    targetUserId: userId,
    oldRole: user.role,
    newRole: role
  })

  res.json({
    message: 'User role updated successfully',
    user: updatedUser
  })
}))

// Deactivate member (Admin only)
router.patch('/members/:userId/deactivate', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params

  // Cannot deactivate self
  if (userId === req.user!.id) {
    return res.status(400).json({
      error: 'Cannot deactivate self',
      message: 'You cannot deactivate your own account'
    })
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId: req.user!.organizationId
    }
  })

  if (!user) {
    throw createApiError('User not found', 404)
  }

  if (!user.isActive) {
    return res.status(400).json({
      error: 'User already inactive',
      message: 'User is already deactivated'
    })
  }

  // Ensure at least one admin remains
  if (user.role === 'ADMIN') {
    const activeAdminCount = await prisma.user.count({
      where: {
        organizationId: req.user!.organizationId,
        role: 'ADMIN',
        isActive: true
      }
    })

    if (activeAdminCount <= 1) {
      return res.status(400).json({
        error: 'Cannot deactivate last admin',
        message: 'Organization must have at least one active admin'
      })
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  })

  logAudit('USER_DEACTIVATED', req.user!.id, req.user!.organizationId, {
    targetUserId: userId,
    targetUserEmail: user.email
  })

  res.json({
    message: 'User deactivated successfully'
  })
}))

// Reactivate member (Admin only)
router.patch('/members/:userId/reactivate', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId: req.user!.organizationId
    }
  })

  if (!user) {
    throw createApiError('User not found', 404)
  }

  if (user.isActive) {
    return res.status(400).json({
      error: 'User already active',
      message: 'User is already active'
    })
  }

  // Check user limits
  const activeUserCount = await prisma.user.count({
    where: {
      organizationId: req.user!.organizationId,
      isActive: true
    }
  })

  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: { maxUsers: true, plan: true }
  })

  if (organization && activeUserCount >= organization.maxUsers) {
    return res.status(403).json({
      error: 'User limit exceeded',
      message: `Your ${organization.plan} plan allows up to ${organization.maxUsers} active users. Please upgrade your plan or deactivate some users.`
    })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true }
  })

  logAudit('USER_REACTIVATED', req.user!.id, req.user!.organizationId, {
    targetUserId: userId,
    targetUserEmail: user.email
  })

  res.json({
    message: 'User reactivated successfully'
  })
}))

// Get organization usage statistics
router.get('/usage', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId

  const [
    organization,
    activeUsers,
    totalAnalyses,
    totalRecords,
    recentActivity
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        maxUsers: true,
        maxProducts: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true
      }
    }),
    prisma.user.count({
      where: { organizationId, isActive: true }
    }),
    prisma.analysis.count({
      where: { organizationId }
    }),
    prisma.analysisRecord.count({
      where: {
        analysis: { organizationId }
      }
    }),
    prisma.auditLog.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ])

  if (!organization) {
    throw createApiError('Organization not found', 404)
  }

  // Calculate usage percentages
  const userUsage = Math.round((activeUsers / organization.maxUsers) * 100)
  const productUsage = Math.round((totalRecords / organization.maxProducts) * 100)

  // Trial status
  const isTrialActive = organization.subscriptionStatus === 'TRIAL'
  const trialDaysLeft = isTrialActive && organization.trialEndsAt
    ? Math.max(0, Math.ceil((organization.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

  res.json({
    plan: organization.plan,
    subscriptionStatus: organization.subscriptionStatus,
    trial: {
      isActive: isTrialActive,
      daysLeft: trialDaysLeft,
      endsAt: organization.trialEndsAt
    },
    usage: {
      users: {
        current: activeUsers,
        limit: organization.maxUsers,
        percentage: userUsage
      },
      products: {
        current: totalRecords,
        limit: organization.maxProducts,
        percentage: productUsage
      }
    },
    statistics: {
      totalAnalyses,
      recentActivity
    }
  })
}))

export default router