/**
 * Error Handler Middleware Tests
 */

import { Request, Response, NextFunction } from 'express'
import { errorHandler } from '../../middleware/errorHandler'
import { ValidationError, NotFoundError } from '../../utils/errors'
import { sendError } from '../../utils/response'
import { logger } from '../../utils/logger'

jest.mock('../../utils/response')
jest.mock('../../utils/logger')

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      path: '/api/test',
      method: 'GET',
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  it('should handle AppError correctly', () => {
    const error = new ValidationError('Invalid input')
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(logger.error).toHaveBeenCalledWith(
      'Invalid input',
      error,
      expect.objectContaining({
        statusCode: 400,
        path: '/api/test',
        method: 'GET',
      })
    )
    expect(sendError).toHaveBeenCalledWith(mockRes as Response, 'Invalid input', 400)
  })

  it('should handle generic Error in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const error = new Error('Generic error')
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled error',
      error,
      expect.objectContaining({
        path: '/api/test',
        method: 'GET',
      })
    )
    expect(sendError).toHaveBeenCalledWith(mockRes as Response, 'Internal server error', 500)
    
    process.env.NODE_ENV = originalEnv
  })

  it('should handle generic Error in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const error = new Error('Generic error')
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(sendError).toHaveBeenCalledWith(mockRes as Response, 'Generic error', 500)
    
    process.env.NODE_ENV = originalEnv
  })

  it('should handle NotFoundError', () => {
    const error = new NotFoundError('User')
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

    expect(sendError).toHaveBeenCalledWith(mockRes as Response, 'User not found', 404)
  })
})
