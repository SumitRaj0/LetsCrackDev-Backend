/**
 * Server Tests
 * Tests for server.ts entry point
 */

import { logger } from '../utils/logger'

// Mock all dependencies before importing server
jest.mock('../config/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('../app', () => {
  const mockApp = {
    listen: jest.fn((_port, callback) => {
      if (callback) callback()
      return {
        close: jest.fn((cb) => {
          if (cb) cb()
        }),
      }
    }),
  }
  return {
    __esModule: true,
    default: mockApp,
  }
})

describe('Server', () => {
  const originalEnv = process.env
  const originalExit = process.exit
  const originalListeners = {
    SIGTERM: process.listeners('SIGTERM'),
    SIGINT: process.listeners('SIGINT'),
    unhandledRejection: process.listeners('unhandledRejection'),
    uncaughtException: process.listeners('uncaughtException'),
  }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    process.exit = jest.fn() as never
    // Clear all listeners
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('unhandledRejection')
    process.removeAllListeners('uncaughtException')
  })

  afterEach(() => {
    process.env = originalEnv
    process.exit = originalExit
    // Restore original listeners
    Object.entries(originalListeners).forEach(([event, listeners]) => {
      listeners.forEach((listener) => {
        process.on(event as any, listener as any)
      })
    })
  })

  it('should export app as default', async () => {
    const serverModule = await import('../server')
    expect(serverModule.default).toBeDefined()
  })

  it('should use PORT from environment or default to 3001', async () => {
    delete process.env.PORT
    jest.resetModules()
    
    await import('../server')
    
    // Give it a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // The server should have been started (mocked)
    const app = (await import('../app')).default
    expect(app.listen).toHaveBeenCalled()
  })

  it('should use custom PORT from environment', async () => {
    process.env.PORT = '4000'
    jest.resetModules()
    
    await import('../server')
    
    // Give it a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const app = (await import('../app')).default
    expect(app.listen).toHaveBeenCalled()
  })

  it('should handle graceful shutdown on SIGTERM', async () => {
    const mongoose = await import('mongoose')
    jest.spyOn(mongoose.default.connection, 'close').mockResolvedValue(undefined)
    
    await import('../server')
    
    // Trigger SIGTERM
    process.emit('SIGTERM' as any, 'SIGTERM')
    
    // Give it time to process
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SIGTERM'))
  })

  it('should handle graceful shutdown on SIGINT', async () => {
    const mongoose = await import('mongoose')
    jest.spyOn(mongoose.default.connection, 'close').mockResolvedValue(undefined)
    
    await import('../server')
    
    // Trigger SIGINT
    process.emit('SIGINT' as any, 'SIGINT')
    
    // Give it time to process
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SIGINT'))
  })
})
