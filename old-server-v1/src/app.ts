import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

// Import utilities
import { envValidator, envConfig } from './utils/envValidator'
import { db } from './utils/database'

// Import middleware
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { authMiddleware } from './middleware/auth'
import { organizationMiddleware } from './middleware/organization'
import { securityHeaders } from './middleware/securityHeaders'

// Import routes
import authRoutes from './routes/auth'
import analysisRoutes from './routes/analysis'
import conflictRoutes from './routes/conflicts'
import organizationRoutes from './routes/organizations'
import billingRoutes from './routes/billing'
import integrationRoutes from './routes/integrations'
import webhookRoutes from './routes/webhooks'
import reportRoutes from './routes/reports'
import adminRoutes from './routes/admin'
import healthRoutes from './routes/health'
import aiRoutes from './routes/ai'

// Import services
import { setupWebSocket } from './services/websocket'
import { logger } from './utils/logger'
import { setupBullDashboard } from './services/queue'

// Validate environment variables before starting
envValidator.validateRequired(envConfig)

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Initialize Prisma with connection retry
export const prisma = db.getClient()

// Security headers
app.use(securityHeaders)

// Helmet for additional security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL!],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS configuration with validation
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL!].filter(Boolean)
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  maxAge: 86400 // 24 hours
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

// Request size limits
app.use(express.json({
  limit: '10mb', // Reduced from 50mb for security
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    if (req.url?.includes('/webhooks/stripe')) {
      (req as any).rawBody = buf
    }
  }
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// WebSocket setup
setupWebSocket(io)

// Bull Dashboard (development only)
if (process.env.NODE_ENV === 'development') {
  setupBullDashboard(app)
}

// API versioning
const API_VERSION = '/api/v1';

// Health check (no auth required)
app.use('/health', healthRoutes)

// Webhook routes (no auth required, has own verification)
app.use(`${API_VERSION}/webhooks`, webhookRoutes)

// Auth routes with specific rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});
app.use(`${API_VERSION}/auth`, authLimiter, authRoutes)

// Protected routes (require authentication)
app.use(`${API_VERSION}/organizations`, authMiddleware, organizationMiddleware, organizationRoutes)
app.use(`${API_VERSION}/analyses`, authMiddleware, organizationMiddleware, analysisRoutes)
app.use(`${API_VERSION}/conflicts`, authMiddleware, organizationMiddleware, conflictRoutes)
app.use(`${API_VERSION}/billing`, authMiddleware, organizationMiddleware, billingRoutes)
app.use(`${API_VERSION}/integrations`, authMiddleware, organizationMiddleware, integrationRoutes)
app.use(`${API_VERSION}/reports`, authMiddleware, organizationMiddleware, reportRoutes)
app.use(`${API_VERSION}/ai`, authMiddleware, organizationMiddleware, aiRoutes)

// Admin routes (require admin role)
app.use(`${API_VERSION}/admin`, authMiddleware, adminRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')

  server.close(() => {
    logger.info('HTTP server closed')
  })

  await prisma.$disconnect()
  logger.info('Database connection closed')

  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')

  server.close(() => {
    logger.info('HTTP server closed')
  })

  await prisma.$disconnect()
  logger.info('Database connection closed')

  process.exit(0)
})

// Start server with database connection
const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    // Connect to database with retry logic
    await db.connectWithRetry();

    if (process.env.NODE_ENV !== 'test') {
      server.listen(PORT, () => {
        logger.info(`🚀 UPC Conflict Resolver API server running on port ${PORT}`);
        logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
        logger.info(`🔗 API Version: v1`);
        logger.info(`📈 Bull Dashboard: http://localhost:${PORT}/admin/queues`);
      });
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, server, io }
export default app