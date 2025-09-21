// Vercel serverless function entry point
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

// Import utilities - simplified for serverless
import { errorHandler } from '../server/src/middleware/errorHandler'
import { requestLogger } from '../server/src/middleware/requestLogger'

// Import routes
import authRoutes from '../server/src/routes/auth'
import analysisRoutes from '../server/src/routes/analysis'
import conflictRoutes from '../server/src/routes/conflicts'
import organizationRoutes from '../server/src/routes/organizations'
import billingRoutes from '../server/src/routes/billing'
import integrationRoutes from '../server/src/routes/integrations'
import webhookRoutes from '../server/src/routes/webhooks'
import reportRoutes from '../server/src/routes/reports'
import adminRoutes from '../server/src/routes/admin'
import healthRoutes from '../server/src/routes/health'
import aiRoutes from '../server/src/routes/ai'

const app = express()

// Essential middleware for Vercel
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(requestLogger)

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})
app.use('/api/', limiter)

// API Routes with /api prefix for Vercel
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/analysis', analysisRoutes)
app.use('/api/v1/conflicts', conflictRoutes)
app.use('/api/v1/organizations', organizationRoutes)
app.use('/api/v1/billing', billingRoutes)
app.use('/api/v1/integrations', integrationRoutes)
app.use('/api/v1/webhooks', webhookRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/', healthRoutes)

// Health check for Vercel
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'vercel'
  })
})

// Error handling
app.use(errorHandler)

export default app;