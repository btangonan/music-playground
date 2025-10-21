// Main Express app entry point
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config/index.js'
import authRoutes from './routes/auth.js'
import loopRoutes from './routes/loops.js'

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration - dynamic origin for development, strict for production
const isDevelopment = config.node.env === 'development'
app.use(cors({
  origin: isDevelopment
    ? (origin, callback) => {
        // Allow any localhost origin in development (handles Vite port auto-increment)
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      }
    : config.server.cors.origin,
  credentials: true,
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/loops', loopRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

// Start server
const PORT = config.server.port

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`)
  console.log(`🎵 Loop endpoints: http://localhost:${PORT}/api/loops`)
})

export default app
