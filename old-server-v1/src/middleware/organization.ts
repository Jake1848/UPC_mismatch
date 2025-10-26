import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

// Middleware to enforce organization-level data isolation
export const organizationMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to access organization data'
      })
    }

    // Check if organization header is provided and matches user's org
    const orgHeader = req.headers['x-organization-id'] as string

    if (orgHeader && orgHeader !== req.user.organizationId) {
      // Log potential security issue
      logger.warn(`User ${req.user.email} attempted to access data for org ${orgHeader}, but belongs to ${req.user.organizationId}`)

      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access data for this organization'
      })
    }

    // Verify organization is still active and user has access
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        subscriptionStatus: true,
        maxUsers: true,
        maxProducts: true
      }
    })

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        message: 'The organization associated with your account no longer exists'
      })
    }

    // Check subscription status
    if (organization.subscriptionStatus === 'CANCELED') {
      return res.status(403).json({
        error: 'Subscription canceled',
        message: 'Your organization\'s subscription has been canceled. Please contact billing to reactivate.'
      })
    }

    if (organization.subscriptionStatus === 'UNPAID') {
      return res.status(403).json({
        error: 'Payment required',
        message: 'Your organization\'s subscription payment is overdue. Please update your billing information.'
      })
    }

    // For trial accounts, check if trial has expired
    if (organization.subscriptionStatus === 'TRIAL') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          organization: {
            select: {
              trialEndsAt: true
            }
          }
        }
      })

      if (user?.organization.trialEndsAt && user.organization.trialEndsAt < new Date()) {
        return res.status(403).json({
          error: 'Trial expired',
          message: 'Your free trial has expired. Please upgrade to a paid plan to continue using the service.'
        })
      }
    }

    // Check plan limits for certain operations
    if (req.method === 'POST' && req.path.includes('/analyses/upload')) {
      // Check if organization has reached product limit
      const totalRecords = await prisma.analysisRecord.count({
        where: {
          analysis: {
            organizationId: req.user.organizationId
          }
        }
      })

      if (totalRecords >= organization.maxProducts) {
        return res.status(403).json({
          error: 'Plan limit exceeded',
          message: `Your ${organization.plan} plan allows up to ${organization.maxProducts.toLocaleString()} products. Please upgrade your plan or delete some analyses.`
        })
      }
    }

    // Attach organization info to request for easy access
    req.user.organization = organization

    next()
  } catch (error) {
    logger.error('Organization middleware error:', error)
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Internal server error during organization verification'
    })
  }
}

// Middleware to check specific plan requirements
export const requirePlan = (plans: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.organization) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Organization information not available'
      })
    }

    if (!plans.includes(req.user.organization.plan)) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires one of the following plans: ${plans.join(', ')}. Your current plan is ${req.user.organization.plan}.`
      })
    }

    next()
  }
}

// Middleware to check enterprise plan
export const requireEnterprise = requirePlan(['ENTERPRISE'])

// Middleware to check professional or enterprise plan
export const requireProfessional = requirePlan(['PROFESSIONAL', 'ENTERPRISE'])

// Middleware to enforce rate limits based on plan
export const planBasedRateLimit = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.organization) {
    return next()
  }

  const plan = req.user.organization.plan
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes

  // Define rate limits per plan
  const limits = {
    STARTER: 100,
    PROFESSIONAL: 500,
    ENTERPRISE: 2000
  }

  const maxRequests = limits[plan as keyof typeof limits] || limits.STARTER

  // In a production environment, you'd use Redis to store these counters
  // For now, we'll use a simple in-memory store (not suitable for production clusters)
  const rateLimitKey = `rate_limit:${req.user.organizationId}`

  // This is a simplified implementation - use Redis in production
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map()
  }

  const store = global.rateLimitStore
  const current = store.get(rateLimitKey) || { count: 0, resetTime: now + windowMs }

  if (now > current.resetTime) {
    current.count = 0
    current.resetTime = now + windowMs
  }

  current.count++
  store.set(rateLimitKey, current)

  if (current.count > maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Your ${plan} plan allows ${maxRequests} requests per 15 minutes. Please upgrade your plan for higher limits.`,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    })
  }

  res.setHeader('X-RateLimit-Limit', maxRequests.toString())
  res.setHeader('X-RateLimit-Remaining', (maxRequests - current.count).toString())
  res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString())

  next()
}