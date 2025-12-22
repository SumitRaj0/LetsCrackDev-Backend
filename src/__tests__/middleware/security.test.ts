/**
 * Security Middleware Tests
 */

import { Request, Response, NextFunction } from 'express'
import { corsMiddleware } from '../../middleware/security'

describe('Security Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      headers: {},
    } as Partial<Request>
    mockRes = {
      setHeader: jest.fn(),
      sendStatus: jest.fn(),
    } as Partial<Response>
    mockNext = jest.fn()
  })

  describe('corsMiddleware', () => {
    it('should handle OPTIONS preflight request', () => {
      mockReq.method = 'OPTIONS'
      if (mockReq.headers) {
        mockReq.headers.origin = 'http://localhost:5173'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.sendStatus).toHaveBeenCalledWith(200)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should set CORS headers for allowed origin', () => {
      if (mockReq.headers) {
        mockReq.headers.origin = 'http://localhost:5173'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow localhost in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      if (mockReq.headers) {
        mockReq.headers.origin = 'http://localhost:3000'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000')
      expect(mockNext).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should use FRONTEND_URL from environment', () => {
      const originalFrontendUrl = process.env.FRONTEND_URL
      process.env.FRONTEND_URL = 'https://example.com'
      if (mockReq.headers) {
        mockReq.headers.origin = 'https://example.com'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com')
      
      process.env.FRONTEND_URL = originalFrontendUrl
    })

    it('should use ALLOWED_ORIGINS from environment', () => {
      const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
      if (mockReq.headers) {
        mockReq.headers.origin = 'https://app.example.com'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.example.com')
      
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins
    })

    it('should not set origin header for disallowed origin in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      if (mockReq.headers) {
        mockReq.headers.origin = 'https://malicious.com'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://malicious.com')
      expect(mockNext).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle request without origin header', () => {
      delete mockReq.headers?.origin

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow 127.0.0.1 in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      if (mockReq.headers) {
        mockReq.headers.origin = 'http://127.0.0.1:5173'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:5173')
      expect(mockNext).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle ALLOWED_ORIGINS with spaces', () => {
      const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
      process.env.ALLOWED_ORIGINS = 'https://app.example.com , https://admin.example.com'
      if (mockReq.headers) {
        mockReq.headers.origin = 'https://app.example.com'
      }

      corsMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.example.com')
      
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins
    })
  })

  describe('securityMiddleware', () => {
    it('should export securityMiddleware array', () => {
      const { securityMiddleware } = require('../../middleware/security')
      expect(Array.isArray(securityMiddleware)).toBe(true)
      expect(securityMiddleware.length).toBeGreaterThan(0)
    })
  })
})
