import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import analysisRoutes from './routes/analysis'
import conflictRoutes from './routes/conflicts'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Startup logging
console.log('='.repeat(100))
console.log('🚀 UPC RESOLVER SERVER V2 - STARTING')
console.log('='.repeat(100))
console.log(`📅 Started at: ${new Date().toISOString()}`)
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🔌 Port: ${PORT}`)
console.log(`🗄️  Database URL: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ NOT CONFIGURED!'}`)
console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ NOT CONFIGURED!'}`)
console.log(`🌐 CORS Origins: ${process.env.CORS_ORIGINS || 'http://localhost:3000'}`)
console.log(`📁 Upload Directory: ${__dirname}/../uploads`)
console.log('='.repeat(100))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  // Log request
  console.log(`➡️  [${timestamp}] ${req.method} ${req.path}`, {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.body && Object.keys(req.body).length > 0 ? '(body present)' : undefined,
    headers: {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? 'Bearer ***' : undefined
    }
  })

  res.on('finish', () => {
    const duration = Date.now() - start
    const statusEmoji = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢'
    console.log(`${statusEmoji} [${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`)
  })

  next()
})

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000']
console.log(`📡 Configuring CORS for origins:`)
corsOrigins.forEach(origin => console.log(`   - ${origin}`))

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    version: '2.0.0',
    node: process.version,
    memory: {
      used: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  }
  console.log('💚 Health check requested - OK')
  res.json(health)
})

// API Routes
console.log('📋 Registering API routes...')
app.use('/api/auth', authRoutes)
console.log('  ✅ POST /api/auth/register')
console.log('  ✅ POST /api/auth/login')
console.log('  ✅ GET  /api/auth/me')

app.use('/api/analysis', analysisRoutes)
console.log('  ✅ GET  /api/analysis')
console.log('  ✅ GET  /api/analysis/:id')
console.log('  ✅ POST /api/analysis/upload')
console.log('  ✅ DELETE /api/analysis/:id')

app.use('/api/conflicts', conflictRoutes)
console.log('  ✅ GET  /api/conflicts')
console.log('  ✅ GET  /api/conflicts/:id')
console.log('  ✅ GET  /api/conflicts/stats')
console.log('  ✅ PATCH /api/conflicts/:id')
console.log('  ✅ POST /api/conflicts/bulk-update')

console.log('='.repeat(100))

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`)
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/me',
      'POST /api/analysis/upload',
      'GET  /api/analysis',
      'GET  /api/analysis/:id',
      'DELETE /api/analysis/:id',
      'GET  /api/conflicts',
      'GET  /api/conflicts/:id',
      'GET  /api/conflicts/stats',
      'PATCH /api/conflicts/:id',
      'POST /api/conflicts/bulk-update',
      'GET  /health'
    ]
  })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 ERROR OCCURRED:')
  console.error('  Message:', err.message)
  console.error('  Path:', req.path)
  console.error('  Method:', req.method)
  console.error('  Stack:', err.stack)

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

app.listen(PORT, () => {
  console.log('='.repeat(100))
  console.log(`✅ SERVER READY AND LISTENING!`)
  console.log(`🌐 URL: http://localhost:${PORT}`)
  console.log(`📚 Health Check: curl http://localhost:${PORT}/health`)
  console.log(`🔍 Try: curl http://localhost:${PORT}/api/auth/me`)
  console.log('='.repeat(100))
  console.log('')
  console.log('💡 Ready to accept requests...')
  console.log('')
})
