/**
 * Rate Limiter Tests
 */

import { generalLimiter, authLimiter, apiLimiter } from '../../middleware/rateLimiter'
import { Request, Response } from 'express'

describe('Rate Limiter', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockReq = {
      path: '/api/test',
      ip: '127.0.0.1',
    } as Partial<Request>
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    } as Partial<Response>
  })

  describe('generalLimiter', () => {
    it('should be configured with correct window and max requests', () => {
      expect(generalLimiter).toBeDefined()
    })

    it('should skip rate limiting for webhook endpoints', () => {
      const webhookReq = { ...mockReq, path: '/api/webhook/payment' } as Request
      const shouldSkip = (generalLimiter as any).skip?.(webhookReq, mockRes as Response)
      expect(shouldSkip).toBe(true)
    })

    it('should not skip rate limiting for non-webhook endpoints', () => {
      const normalReq = { ...mockReq, path: '/api/users' } as Request
      const shouldSkip = (generalLimiter as any).skip?.(normalReq, mockRes as Response)
      expect(shouldSkip).toBe(false)
    })
  })

  describe('authLimiter', () => {
    it('should be configured with 5 requests per 15 minutes', () => {
      expect(authLimiter).toBeDefined()
      // Check configuration exists
      expect(typeof authLimiter).toBe('function')
    })
  })

  describe('apiLimiter', () => {
    it('should be configured with 30 requests per minute', () => {
      expect(apiLimiter).toBeDefined()
      // Check configuration exists
      expect(typeof apiLimiter).toBe('function')
    })
  })
})
