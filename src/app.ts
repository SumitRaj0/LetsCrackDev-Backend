/**
 * Express Application Setup
 * Creates and configures the Express app instance (no server.listen here).
 */

import express from 'express'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFound'
import { securityMiddleware, corsMiddleware } from './middleware/security'
import { requestLogger } from './middleware/logger'
import { generalLimiter } from './middleware/rateLimiter'
import { logger } from './utils/logger'
import routes from './routes'

const app = express()

const API_VERSION = process.env.API_VERSION || 'v1'

// Core middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(corsMiddleware)
app.use(...securityMiddleware)

// Debug: Log all incoming requests
app.use((req, _res, next) => {
  logger.info(`[REQUEST] ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    path: req.path,
    origin: req.headers.origin,
    'content-type': req.headers['content-type'],
  })
  next()
})

app.use(requestLogger)

// Root endpoint - API information
app.get('/', (_req, res) => {
  res.json({
    name: 'LetsCrackDev API',
    version: API_VERSION,
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: `/api/${API_VERSION}`,
      legacy: '/api',
    },
  })
})

// Health check endpoint (before rate limiting)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Apply general rate limiting to all routes
app.use(generalLimiter)

// API Routes (folder-based routing via routes/index.ts)
app.use(`/api/${API_VERSION}`, routes)

// Legacy API route (for backward compatibility)
app.use('/api', routes)

// 404 handler
app.use(notFoundHandler)

// Error handler (must be last)
app.use(errorHandler)

export default app


