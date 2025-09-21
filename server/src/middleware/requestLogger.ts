import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { AuthenticatedRequest } from './auth'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  const requestId = generateRequestId()

  // Add request ID to headers for tracking
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)

  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: getClientIP(req),
    timestamp: new Date().toISOString()
  })

  // Override res.end to log response
  const originalEnd = res.end
  res.end = function (chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - start
    const authReq = req as AuthenticatedRequest

    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
      userId: authReq.user?.id,
      organizationId: authReq.user?.organizationId,
      userAgent: req.headers['user-agent'],
      ip: getClientIP(req)
    })

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userId: authReq.user?.id,
        organizationId: authReq.user?.organizationId
      })
    }

    // Log errors
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn'
      logger[logLevel]('Request error', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: authReq.user?.id,
        organizationId: authReq.user?.organizationId,
        body: logLevel === 'error' ? req.body : undefined
      })
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding, callback)
  }

  next()
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  ).split(',')[0].trim()
}