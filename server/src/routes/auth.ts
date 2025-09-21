import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { logger, logAudit, logSecurity } from '../utils/logger'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('organizationName').isLength({ min: 1 }).withMessage('Organization name is required'),
  body('organizationSlug').optional().isLength({ min: 3 }).withMessage('Organization slug must be at least 3 characters'),
]

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
]

const inviteValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['ADMIN', 'ANALYST', 'VIEWER']).withMessage('Valid role is required'),
  body('name').optional().isLength({ min: 1 }).withMessage('Name cannot be empty'),
]

// Helper function to generate JWT token
const generateToken = (userId: string, email: string, organizationId: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return jwt.sign(
    { userId, email, organizationId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// Helper function to create organization slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

// Register new organization and admin user
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: errors.array()
    })
  }

  const { email, password, name, organizationName, organizationSlug } = req.body
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      logSecurity('Registration attempt with existing email', 'medium', {
        email,
        ip: clientIP,
        userAgent: req.headers['user-agent']
      })

      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email address already exists'
      })
    }

    // Create organization slug
    const slug = organizationSlug || createSlug(organizationName)

    // Check if organization slug is available
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return res.status(409).json({
        error: 'Organization slug unavailable',
        message: 'Please choose a different organization slug'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create organization and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          plan: 'STARTER',
          subscriptionStatus: 'TRIAL',
          maxUsers: 3,
          maxProducts: 100000,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          settings: {
            notifications: {
              email: true,
              slack: false,
              teams: false
            },
            analysis: {
              autoAssignConflicts: false,
              severityThresholds: {
                low: 2,
                medium: 5,
                high: 10,
                critical: 50
              }
            }
          }
        }
      })

      // Create admin user
      const user = await tx.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: hashedPassword,
          role: 'ADMIN',
          organizationId: organization.id,
          settings: {
            theme: 'light',
            notifications: {
              email: true,
              desktop: true
            }
          }
        }
      })

      return { organization, user }
    })

    // Generate JWT token
    const token = generateToken(result.user.id, result.user.email, result.organization.id)

    // Log successful registration
    logAudit('USER_REGISTERED', result.user.id, result.organization.id, {
      email,
      organizationName,
      ip: clientIP,
      userAgent: req.headers['user-agent']
    })

    logger.info(`New organization registered: ${organizationName} (${slug}) by ${email}`)

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        organizationId: result.organization.id
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        plan: result.organization.plan,
        subscriptionStatus: result.organization.subscriptionStatus,
        trialEndsAt: result.organization.trialEndsAt
      }
    })
  } catch (error) {
    logger.error('Registration error:', error)
    throw createApiError('Registration failed', 500)
  }
}))

// Login user
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: errors.array()
    })
  }

  const { email, password } = req.body
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  try {
    // Find user with organization
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            subscriptionStatus: true,
            trialEndsAt: true
          }
        }
      }
    })

    if (!user || !user.password) {
      logSecurity('Login attempt with invalid email', 'low', {
        email,
        ip: clientIP,
        userAgent: req.headers['user-agent']
      })

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      logSecurity('Login attempt with deactivated account', 'medium', {
        email,
        userId: user.id,
        ip: clientIP,
        userAgent: req.headers['user-agent']
      })

      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact your administrator.'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      logSecurity('Login attempt with invalid password', 'medium', {
        email,
        userId: user.id,
        ip: clientIP,
        userAgent: req.headers['user-agent']
      })

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      })
    }

    // Check organization status
    if (user.organization.subscriptionStatus === 'CANCELED') {
      return res.status(403).json({
        error: 'Subscription canceled',
        message: 'Your organization\'s subscription has been canceled. Please contact billing to reactivate.'
      })
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.organizationId)

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Log successful login
    logAudit('USER_LOGIN', user.id, user.organizationId, {
      email,
      ip: clientIP,
      userAgent: req.headers['user-agent']
    })

    logger.info(`User logged in: ${email} (${user.role}) for org: ${user.organization.name}`)

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        lastLoginAt: user.lastLoginAt
      },
      organization: user.organization
    })
  } catch (error) {
    logger.error('Login error:', error)
    throw createApiError('Login failed', 500)
  }
}))

// Get current user profile
router.get('/me', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          maxUsers: true,
          maxProducts: true
        }
      }
    }
  })

  if (!user) {
    throw createApiError('User not found', 404)
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      settings: user.settings,
      createdAt: user.createdAt
    },
    organization: user.organization
  })
}))

// Update user profile
router.patch('/me', authMiddleware, [
  body('name').optional().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { name, settings } = req.body

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(settings && { settings })
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      settings: true,
      updatedAt: true
    }
  })

  logAudit('USER_PROFILE_UPDATED', req.user!.id, req.user!.organizationId, {
    updatedFields: Object.keys(req.body)
  })

  res.json({
    message: 'Profile updated successfully',
    user: updatedUser
  })
}))

// Change password
router.post('/change-password', authMiddleware, [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { currentPassword, newPassword } = req.body

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, password: true }
  })

  if (!user || !user.password) {
    throw createApiError('User not found', 404)
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password)

  if (!isValidPassword) {
    logSecurity('Invalid current password during password change', 'medium', {
      userId: req.user!.id,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })

    return res.status(401).json({
      error: 'Invalid current password',
      message: 'The current password you entered is incorrect'
    })
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12)

  // Update password
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password: hashedNewPassword }
  })

  logAudit('PASSWORD_CHANGED', req.user!.id, req.user!.organizationId)
  logSecurity('Password changed successfully', 'low', {
    userId: req.user!.id
  })

  res.json({
    message: 'Password changed successfully'
  })
}))

// Invite team member (Admin only)
router.post('/invite', authMiddleware, inviteValidation, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  // Check if user is admin
  if (req.user!.role !== 'ADMIN') {
    throw createApiError('Insufficient permissions', 403)
  }

  const { email, role, name } = req.body

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists',
      message: 'A user with this email address already exists'
    })
  }

  // Check organization user limits
  const userCount = await prisma.user.count({
    where: {
      organizationId: req.user!.organizationId,
      isActive: true
    }
  })

  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: { maxUsers: true, plan: true }
  })

  if (organization && userCount >= organization.maxUsers) {
    return res.status(403).json({
      error: 'User limit exceeded',
      message: `Your ${organization.plan} plan allows up to ${organization.maxUsers} users. Please upgrade your plan or deactivate some users.`
    })
  }

  // Generate temporary password
  const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

  // Create user
  const newUser = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      role,
      organizationId: req.user!.organizationId,
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          desktop: false
        }
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  })

  logAudit('USER_INVITED', req.user!.id, req.user!.organizationId, {
    invitedUserEmail: email,
    invitedUserRole: role
  })

  // TODO: Send invitation email with temporary password
  logger.info(`User invited: ${email} (${role}) to org: ${req.user!.organizationId}`)

  res.status(201).json({
    message: 'User invited successfully',
    user: newUser,
    temporaryPassword // In production, this should be sent via email, not returned in response
  })
}))

// Logout (client-side token invalidation)
router.post('/logout', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  logAudit('USER_LOGOUT', req.user!.id, req.user!.organizationId)

  res.json({
    message: 'Logged out successfully'
  })
}))

export default router