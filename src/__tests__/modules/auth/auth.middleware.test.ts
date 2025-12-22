/**
 * Auth Middleware Tests
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { requireAuth, requireAdmin, JwtUserPayload } from '../../../modules/auth/auth.middleware'
import { UnauthorizedError, ForbiddenError } from '../../../utils/errors'

jest.mock('jsonwebtoken')

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockRequest = {
      headers: {},
    }
    mockResponse = {}
    mockNext = jest.fn()
    
    // Set default environment variable
    process.env.ACCESS_TOKEN_SECRET = 'test-secret-key-min-32-chars-long-for-testing'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should authenticate user with valid token', () => {
      const mockPayload: JwtUserPayload = {
        sub: 'user123',
        role: 'user',
        email: 'test@example.com',
      }

      ;(jwt.verify as jest.Mock).mockReturnValue(mockPayload)
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      }

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key-min-32-chars-long-for-testing')
      expect((mockRequest as any).authUser).toEqual({
        sub: 'user123',
        role: 'user',
        email: 'test@example.com',
      })
      expect(mockNext).toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when authorization header is missing', () => {
      mockRequest.headers = {}

      expect(() => {
        requireAuth(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(UnauthorizedError)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when authorization header does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'Invalid token',
      }

      expect(() => {
        requireAuth(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(UnauthorizedError)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when token is invalid', () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }

      expect(() => {
        requireAuth(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(UnauthorizedError)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when token is expired', () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired')
        ;(error as any).name = 'TokenExpiredError'
        throw error
      })

      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      }

      expect(() => {
        requireAuth(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(UnauthorizedError)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw error when ACCESS_TOKEN_SECRET is not defined', () => {
      const originalSecret = process.env.ACCESS_TOKEN_SECRET
      delete process.env.ACCESS_TOKEN_SECRET

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      }

      expect(() => {
        requireAuth(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow()

      // Restore for other tests
      process.env.ACCESS_TOKEN_SECRET = originalSecret
    })

    it('should extract token correctly from Bearer header', () => {
      const mockPayload: JwtUserPayload = {
        sub: 'user123',
        role: 'user',
      }

      ;(jwt.verify as jest.Mock).mockReturnValue(mockPayload)
      mockRequest.headers = {
        authorization: 'Bearer token-with-spaces',
      }

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(jwt.verify).toHaveBeenCalledWith('token-with-spaces', expect.any(String))
    })

    it('should handle payload without email', () => {
      const mockPayload: JwtUserPayload = {
        sub: 'user123',
        role: 'user',
      }

      ;(jwt.verify as jest.Mock).mockReturnValue(mockPayload)
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      }

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect((mockRequest as any).authUser).toEqual({
        sub: 'user123',
        role: 'user',
        email: undefined,
      })
    })
  })

  describe('requireAdmin', () => {
    it('should allow admin user to proceed', () => {
      ;(mockRequest as any).authUser = {
        sub: 'admin123',
        role: 'admin',
        email: 'admin@example.com',
      }

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should throw ForbiddenError when user is not admin', () => {
      ;(mockRequest as any).authUser = {
        sub: 'user123',
        role: 'user',
        email: 'user@example.com',
      }

      expect(() => {
        requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(ForbiddenError)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when user is not authenticated', () => {
      ;(mockRequest as any).authUser = undefined

      expect(() => {
        requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(UnauthorizedError)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when authUser is null', () => {
      ;(mockRequest as any).authUser = null

      expect(() => {
        requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)
      }).toThrow(UnauthorizedError)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
