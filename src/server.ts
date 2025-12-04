/**
 * Main Server File
 * Responsible only for environment setup, DB connection and starting the HTTP server.
 * The Express app configuration lives in app.ts.
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import connectDB from './config/db'
import { logger } from './utils/logger'
import app from './app'

const PORT = process.env.PORT || 3001

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`)
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed')
  })

  // Disconnect MongoDB
  const mongoose = await import('mongoose')
  await mongoose.default.connection.close()
  logger.info('MongoDB disconnected')

  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server FIRST (don't wait for MongoDB)
const server = app.listen(PORT, () => {
  logger.info(`🚀 LetsCrackDev API Server running on http://localhost:${PORT}`)
  logger.info(`📡 API endpoint: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`)
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`)
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Connect to MongoDB (non-blocking - server will run even if MongoDB fails)
connectDB().catch((err) => {
  logger.error('Failed to connect to MongoDB:', err)
  logger.warn('⚠️  Server will continue running without database connection')
  logger.warn('⚠️  Some features may not work until MongoDB is connected')
  // Don't exit - let the server run anyway
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection', err)
  server.close(() => {
    process.exit(1)
  })
})

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception', err)
  process.exit(1)
})

export default app

