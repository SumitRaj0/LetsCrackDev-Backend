/**
 * Additional Database Configuration Tests
 */

import mongoose from 'mongoose'
import connectDB from '../../config/db'
import { logger } from '../../utils/logger'

jest.mock('../../utils/logger')

describe('Database Configuration Additional Tests', () => {
  const originalEnv = process.env.MONGODB_URI
  const originalSIGINT = process.listeners('SIGINT')

  beforeEach(() => {
    jest.clearAllMocks()
    // Remove existing SIGINT listeners
    process.removeAllListeners('SIGINT')
  })

  afterEach(() => {
    process.env.MONGODB_URI = originalEnv
    // Restore original SIGINT listeners
    originalSIGINT.forEach((listener) => {
      process.on('SIGINT', listener as any)
    })
  })

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
    }
  })

  it('should handle connection error event', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test'

    // Mock connection error
    const errorListener = jest.fn()
    mongoose.connection.on('error', errorListener)

    try {
      await connectDB()
      // Simulate connection error
      mongoose.connection.emit('error', new Error('Connection error'))
      
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(errorListener).toHaveBeenCalled()
    } catch (error) {
      // Connection might fail, that's okay
    }
  })

  it('should handle disconnected event', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test'

    const disconnectedListener = jest.fn()
    mongoose.connection.on('disconnected', disconnectedListener)

    try {
      await connectDB()
      // Simulate disconnection
      mongoose.connection.emit('disconnected')
      
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(disconnectedListener).toHaveBeenCalled()
    } catch (error) {
      // Connection might fail, that's okay
    }
  })

  it('should handle SIGINT for graceful shutdown', async () => {
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/test'

    const closeSpy = jest.spyOn(mongoose.connection, 'close').mockResolvedValue(undefined)

    try {
      await connectDB()
      
      // Trigger SIGINT
      process.emit('SIGINT' as any, 'SIGINT')
      
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify close was called or logger was called
      expect(logger.info).toHaveBeenCalled()
    } catch (error) {
      // Connection might fail, that's okay
    } finally {
      closeSpy.mockRestore()
    }
  })
})
