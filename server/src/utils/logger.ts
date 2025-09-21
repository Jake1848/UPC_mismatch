import winston from 'winston'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define level colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(colors)

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.splat !== undefined ? ` ${JSON.stringify(info.splat)}` : ''
    }`
  )
)

// Custom format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create transports array
const transports: winston.transport[] = []

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: devFormat,
      level: 'debug'
    })
  )
} else {
  // Console transport for production (JSON format)
  transports.push(
    new winston.transports.Console({
      format: prodFormat,
      level: 'info'
    })
  )
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  )

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  )
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format: process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
})

// Create audit logger for security events
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ],
  exitOnError: false,
})

// Helper functions for structured logging
export const logError = (message: string, error: Error, context?: any) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
  })
}

export const logAudit = (action: string, userId?: string, organizationId?: string, details?: any) => {
  auditLogger.info('Audit log entry', {
    action,
    userId,
    organizationId,
    details,
    timestamp: new Date().toISOString(),
    ip: details?.ip,
    userAgent: details?.userAgent,
  })
}

// Performance logging
export const logPerformance = (operation: string, duration: number, context?: any) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    context,
  })

  // Log slow operations
  if (duration > 5000) {
    logger.warn('Slow operation detected', {
      operation,
      duration: `${duration}ms`,
      context,
    })
  }
}

// Database query logging
export const logQuery = (query: string, duration: number, params?: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database query', {
      query,
      duration: `${duration}ms`,
      params,
    })
  }

  // Log slow queries in production
  if (duration > 1000) {
    logger.warn('Slow database query', {
      query,
      duration: `${duration}ms`,
      params: process.env.NODE_ENV === 'development' ? params : '[REDACTED]',
    })
  }
}

// Security event logging
export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: any) => {
  const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn'

  logger[logLevel]('Security event', {
    event,
    severity,
    context,
    timestamp: new Date().toISOString(),
  })

  // Also log to audit log
  auditLogger.warn('Security event', {
    event,
    severity,
    context,
    timestamp: new Date().toISOString(),
  })
}