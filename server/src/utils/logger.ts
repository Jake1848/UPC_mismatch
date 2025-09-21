import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { AsyncLocalStorage } from 'async_hooks'

// Request context storage
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  organizationId?: string;
  userAgent?: string;
  ip?: string;
}>();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Audit log levels
const auditLevels = {
  error: 0,
  warn: 1,
  info: 2,
  audit: 3,
  security: 4,
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

// Enhanced format with request context
const contextFormat = winston.format((info) => {
  const context = requestContext.getStore();
  if (context) {
    info.requestId = context.requestId;
    info.userId = context.userId;
    info.organizationId = context.organizationId;
    info.userAgent = context.userAgent;
    info.ip = context.ip;
  }

  // Add service information
  info.service = 'upc-resolver-api';
  info.version = process.env.npm_package_version || '1.0.0';
  info.environment = process.env.NODE_ENV || 'development';
  info.hostname = process.env.HOSTNAME || require('os').hostname();
  info.pid = process.pid;

  return info;
});

// Custom format for development
const devFormat = winston.format.combine(
  contextFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const context = info.requestId ? `[${info.requestId}]` : '';
      const user = info.userId ? `[User:${info.userId}]` : '';
      const org = info.organizationId ? `[Org:${info.organizationId}]` : '';
      return `${info.timestamp} ${info.level}: ${context}${user}${org} ${info.message}${
        info.splat !== undefined ? ` ${JSON.stringify(info.splat)}` : ''
      }`;
    }
  )
)

// Custom format for production with structured logging
const prodFormat = winston.format.combine(
  contextFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Ensure sensitive data is not logged
    const sanitized = { ...info };
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) delete sanitized.token;
    if (sanitized.apiKey) delete sanitized.apiKey;
    if (sanitized.secret) delete sanitized.secret;
    return JSON.stringify(sanitized);
  })
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

// File transports with daily rotation
if (process.env.NODE_ENV !== 'development') {
  // Error log with daily rotation
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: prodFormat,
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: 'logs/error-audit.json',
      zippedArchive: true,
    })
  );

  // Combined log with daily rotation
  transports.push(
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      format: prodFormat,
      maxSize: '100m',
      maxFiles: '7d',
      auditFile: 'logs/app-audit.json',
      zippedArchive: true,
    })
  );

  // HTTP access logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/access-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      format: prodFormat,
      maxSize: '50m',
      maxFiles: '30d',
      auditFile: 'logs/access-audit.json',
      zippedArchive: true,
    })
  );
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
  levels: auditLevels,
  level: 'info',
  format: winston.format.combine(
    contextFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '365d', // Keep audit logs for 1 year
      auditFile: 'logs/audit-file-audit.json',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'security',
      maxSize: '20m',
      maxFiles: '365d',
      auditFile: 'logs/security-file-audit.json',
      zippedArchive: true,
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
  const requestCtx = requestContext.getStore();

  logger[logLevel]('Security event', {
    event,
    severity,
    context,
    userId: requestCtx?.userId,
    organizationId: requestCtx?.organizationId,
    ip: requestCtx?.ip,
    userAgent: requestCtx?.userAgent,
    timestamp: new Date().toISOString(),
  })

  // Also log to audit log
  auditLogger.log('security', 'Security event', {
    event,
    severity,
    context,
    userId: requestCtx?.userId,
    organizationId: requestCtx?.organizationId,
    ip: requestCtx?.ip,
    userAgent: requestCtx?.userAgent,
    timestamp: new Date().toISOString(),
  })
}

// Request logging middleware
export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  // Generate request ID if not present
  if (!req.requestId) {
    req.requestId = require('crypto').randomUUID();
  }

  const context = {
    requestId: req.requestId,
    userId: req.user?.id,
    organizationId: req.user?.organizationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  };

  requestContext.run(context, () => {
    res.on('finish', () => {
      const duration = Date.now() - start;

      logger.http('Request completed', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length'),
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
    });

    next();
  });
};

// Business event logging
export const logBusinessEvent = (event: string, details: any = {}) => {
  const context = requestContext.getStore();

  logger.info(`Business Event: ${event}`, {
    event,
    details,
    userId: context?.userId,
    organizationId: context?.organizationId,
    requestId: context?.requestId,
    timestamp: new Date().toISOString(),
    type: 'business_event'
  });
};

export default logger