import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name: string | null
    role: string
    organizationId: string
    organization?: {
      id: string
      name: string
      slug: string
      plan: string
      subscriptionStatus: string
    }
  }
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured')
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication service is not properly configured'
      })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string
      email: string
      organizationId: string
      iat: number
      exp: number
    }

    // Fetch user with organization details
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
        isActive: true
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            subscriptionStatus: true
          }
        }
      }
    })

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or account deactivated'
      })
    }

    // Check if organization is active
    if (user.organization.subscriptionStatus === 'CANCELED') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Organization subscription has been canceled'
      })
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization
    }

    logger.debug(`Authenticated user: ${user.email} (${user.role}) for org: ${user.organization.name}`)

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication token is invalid or expired'
      })
    }

    logger.error('Authentication middleware error:', error)
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    })
  }
}

// Middleware to check specific roles
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      })
    }

    next()
  }
}

// Middleware to check admin role
export const requireAdmin = requireRole(['ADMIN'])

// Middleware to check admin or analyst roles
export const requireAnalyst = requireRole(['ADMIN', 'ANALYST'])

// API Key authentication middleware
export const apiKeyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the X-API-Key header'
      })
    }

    // API keys are stored as hashed values
    const hashedKey = require('crypto').createHash('sha256').update(apiKey).digest('hex')

    const keyRecord = await prisma.apiKey.findUnique({
      where: {
        keyHash: hashedKey,
        isActive: true
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            subscriptionStatus: true
          }
        }
      }
    })

    if (!keyRecord) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been revoked'
      })
    }

    // Check if key has expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({
        error: 'API key expired',
        message: 'The provided API key has expired'
      })
    }

    // Check organization status
    if (keyRecord.organization.subscriptionStatus === 'CANCELED') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Organization subscription has been canceled'
      })
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    })

    // Create a synthetic user object for API key requests
    req.user = {
      id: 'api-key-' + keyRecord.id,
      email: `api-key-${keyRecord.name}@${keyRecord.organization.slug}.api`,
      name: `API Key: ${keyRecord.name}`,
      role: 'API_KEY',
      organizationId: keyRecord.organizationId,
      organization: keyRecord.organization
    }

    logger.debug(`API key authenticated: ${keyRecord.name} for org: ${keyRecord.organization.name}`)

    next()
  } catch (error) {
    logger.error('API key authentication error:', error)
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during API key authentication'
    })
  }
}

// Combined auth middleware that supports both JWT and API key
export const flexibleAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const hasApiKey = req.headers['x-api-key']
  const hasBearerToken = req.headers.authorization?.startsWith('Bearer ')

  if (hasApiKey) {
    return apiKeyAuth(req, res, next)
  } else if (hasBearerToken) {
    return authMiddleware(req, res, next)
  } else {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide either a Bearer token or API key'
    })
  }
}