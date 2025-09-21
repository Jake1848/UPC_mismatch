import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

// Import middleware
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { authMiddleware } from './middleware/auth'
import { organizationMiddleware } from './middleware/organization'

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

// Import services
import { setupWebSocket } from './services/websocket'
import { logger } from './utils/logger'
import { setupBullDashboard } from './services/queue'

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Initialize Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL!]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
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

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    if (req.url?.includes('/webhooks/stripe')) {
      (req as any).rawBody = buf
    }
  }
}))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Request logging
app.use(requestLogger)

// WebSocket setup
setupWebSocket(io)

// Bull Dashboard (development only)
if (process.env.NODE_ENV === 'development') {
  setupBullDashboard(app)
}

// Health check (no auth required)
app.use('/health', healthRoutes)

// Webhook routes (no auth required, has own verification)
app.use('/api/webhooks', webhookRoutes)

// Auth routes (no auth required)
app.use('/api/auth', authRoutes)

// Protected routes (require authentication)
app.use('/api/organizations', authMiddleware, organizationMiddleware, organizationRoutes)
app.use('/api/analyses', authMiddleware, organizationMiddleware, analysisRoutes)
app.use('/api/conflicts', authMiddleware, organizationMiddleware, conflictRoutes)
app.use('/api/billing', authMiddleware, organizationMiddleware, billingRoutes)
app.use('/api/integrations', authMiddleware, organizationMiddleware, integrationRoutes)
app.use('/api/reports', authMiddleware, organizationMiddleware, reportRoutes)

// Admin routes (require admin role)
app.use('/api/admin', authMiddleware, adminRoutes)

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

// Start server
const PORT = process.env.PORT || 5000

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`🚀 UPC Conflict Resolver API server running on port ${PORT}`)
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`)
    logger.info(`🔗 GraphQL Playground: http://localhost:${PORT}/graphql`)
    logger.info(`📈 Bull Dashboard: http://localhost:${PORT}/admin/queues`)
  })
}

export { app, server, io }
export default app