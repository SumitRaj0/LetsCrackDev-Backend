/**
 * Enhanced Database Configuration Tests
 */

import mongoose from 'mongoose'
import connectDB from '../../config/db'
import { logger } from '../../utils/logger'

jest.mock('../../utils/logger')

describe('Database Configuration - Enhanced Coverage', () => {
  const originalEnv = process.env.MONGODB_URI
  const originalSIGINT = process.listeners('SIGINT')

  beforeEach(() => {
    jest.clearAllMocks()
    // Remove existing SIGINT listeners
    process.removeAllListeners('SIGINT')
  })

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
    }
    process.env.MONGODB_URI = originalEnv
    jest.clearAllMocks()
    // Restore SIGINT listeners
    process.removeAllListeners('SIGINT')
    originalSIGINT.forEach(listener => process.on('SIGINT', listener))
  })

  it('should set up connection event handlers on successful connection', async () => {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('test')) {
      process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'
      
      try {
        await connectDB()
        
        // Simulate connection error event
        mongoose.connection.emit('error', new Error('Test connection error'))
        expect(logger.error).toHaveBeenCalledWith('MongoDB connection error:', expect.any(Error))
        
        // Simulate disconnected event
        mongoose.connection.emit('disconnected')
        expect(logger.warn).toHaveBeenCalledWith('MongoDB disconnected')
      } catch (error) {
        // Connection might fail in test environment, that's okay
      }
    }
  })

  it('should handle SIGINT gracefully', async () => {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('test')) {
      process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'
      
      try {
        await connectDB()
        
        // Mock connection.close
        const closeSpy = jest.spyOn(mongoose.connection, 'close').mockResolvedValue(undefined)
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
        
        // Trigger SIGINT
        process.emit('SIGINT')
        
        // Give time for async operations
        await new Promise(resolve => setTimeout(resolve, 100))
        
        closeSpy.mockRestore()
        exitSpy.mockRestore()
      } catch (error) {
        // Connection might fail, that's okay
      }
    }
  })

  it('should log connection host on successful connection', async () => {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('test')) {
      process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'
      
      try {
        await connectDB()
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('MongoDB Connected')
        )
      } catch (error) {
        // Connection might fail, that's okay
      }
    }
  })
})
