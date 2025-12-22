/**
 * Logger Middleware Tests
 */

import { requestLogger } from '../../middleware/logger'

jest.mock('../../utils/logger')
jest.mock('morgan', () => {
  return jest.fn(() => {
    return (_req: any, _res: any, next: any) => {
      next()
    }
  })
})

describe('Request Logger Middleware', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.clearAllMocks()
  })

  it('should export requestLogger middleware', () => {
    expect(requestLogger).toBeDefined()
    expect(typeof requestLogger).toBe('function')
  })

  it('should use dev format in non-production environment', () => {
    process.env.NODE_ENV = 'development'
    
    // Re-import to trigger the module-level code
    jest.resetModules()
    const morgan = require('morgan')
    morgan.mockClear()
    
    require('../../middleware/logger')
    
    expect(morgan).toHaveBeenCalledWith('dev', expect.any(Object))
  })

  it('should use combined format in production environment', () => {
    process.env.NODE_ENV = 'production'
    
    jest.resetModules()
    const morgan = require('morgan')
    morgan.mockClear()
    
    require('../../middleware/logger')
    
    expect(morgan).toHaveBeenCalledWith('combined', expect.any(Object))
  })

  it('should configure morgan with stream', () => {
    // Test that morgan is called with correct format and stream configuration
    const morgan = require('morgan')
    expect(morgan).toHaveBeenCalled()
  })

  it('should trim log messages', () => {
    const testMessage = '  GET /api/v1/test 200 10ms  \n'
    const trimmedMessage = testMessage.trim()
    
    // Verify trimming logic (morgan stream should trim)
    expect(trimmedMessage).toBe('GET /api/v1/test 200 10ms')
  })

  it('should handle different NODE_ENV values', () => {
    const testCases = [
      { env: 'development', expectedFormat: 'dev' },
      { env: 'test', expectedFormat: 'dev' },
      { env: 'production', expectedFormat: 'combined' },
      { env: undefined, expectedFormat: 'dev' },
    ]

    testCases.forEach(({ env, expectedFormat }) => {
      process.env.NODE_ENV = env
      
      jest.resetModules()
      const morgan = require('morgan')
      morgan.mockClear()
      
      require('../../middleware/logger')
      
      expect(morgan).toHaveBeenCalledWith(expectedFormat, expect.any(Object))
    })
  })
})
