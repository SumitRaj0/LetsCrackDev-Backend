/**
 * MongoDB Connection Configuration
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { logger } from '../utils/logger'

// Load environment variables if not already loaded
dotenv.config()

const connectDB = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || ''

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI)

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`)

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed through app termination')
      process.exit(0)
    })
  } catch (error) {
    logger.error('MongoDB connection failed:', error)
    // Don't exit - let the server continue running without database
    // The server is designed to handle this gracefully
    throw error // Re-throw so caller can handle it
  }
}

export default connectDB

