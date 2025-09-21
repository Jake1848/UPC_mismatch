import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
  details?: any
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    userId: (req as any).user?.id,
    organizationId: (req as any).user?.organizationId,
  })

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, res)
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Invalid data provided',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }

  // Handle file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum size limit of 50MB'
    })
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Invalid file',
      message: 'Unexpected file field or too many files'
    })
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided authentication token is invalid'
    })
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The authentication token has expired'
    })
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      details: error.details
    })
  }

  // Handle custom API errors
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.name || 'API Error',
      message: error.message,
      code: error.code,
      details: error.details
    })
  }

  // Handle specific known errors
  switch (error.message) {
    case 'Organization not found':
      return res.status(404).json({
        error: 'Organization not found',
        message: 'The requested organization does not exist or you do not have access to it'
      })

    case 'Analysis not found':
      return res.status(404).json({
        error: 'Analysis not found',
        message: 'The requested analysis does not exist or you do not have access to it'
      })

    case 'Conflict not found':
      return res.status(404).json({
        error: 'Conflict not found',
        message: 'The requested conflict does not exist or you do not have access to it'
      })

    case 'User not found':
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      })

    case 'Insufficient permissions':
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to perform this action'
      })

    case 'Subscription required':
      return res.status(402).json({
        error: 'Subscription required',
        message: 'This feature requires an active subscription'
      })
  }

  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development'
      ? error.message
      : 'An unexpected error occurred. Please try again later.',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  })
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, res: Response) {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[]
      return res.status(409).json({
        error: 'Duplicate entry',
        message: `A record with this ${field?.[0] || 'value'} already exists`,
        field: field?.[0]
      })

    case 'P2003':
      // Foreign key constraint violation
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'The referenced record does not exist'
      })

    case 'P2004':
      // Constraint violation
      return res.status(400).json({
        error: 'Constraint violation',
        message: 'The operation violates a database constraint'
      })

    case 'P2025':
      // Record not found
      return res.status(404).json({
        error: 'Record not found',
        message: 'The requested record does not exist'
      })

    case 'P2034':
      // Transaction conflict
      return res.status(409).json({
        error: 'Transaction conflict',
        message: 'The operation conflicts with another transaction'
      })

    default:
      // Generic Prisma error
      return res.status(500).json({
        error: 'Database error',
        message: process.env.NODE_ENV === 'development'
          ? error.message
          : 'A database error occurred',
        code: error.code
      })
  }
}

// Helper function to create API errors
export const createApiError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiError => {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  error.code = code
  error.details = details
  return error
}

// Async error wrapper to avoid try-catch in every route
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}