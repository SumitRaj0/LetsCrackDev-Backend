/**
 * Purchase Controller Edge Cases Tests
 * Tests edge cases and error scenarios to increase coverage
 */

import { Request, Response, NextFunction } from 'express'
import { Purchase } from '../../../modules/purchases/purchase.model'
import { Service } from '../../../modules/services/service.model'
import { Course } from '../../../modules/courses/course.model'
import {
  createCheckoutSession,
  verifyPayment,
  getPurchaseStatus,
  getPurchases,
  handleWebhook,
} from '../../../modules/purchases/purchase.controller'
import { ValidationError, NotFoundError, BadRequestError, InternalServerError } from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'
import { razorpay } from '../../../config/razorpay'

jest.mock('../../../config/razorpay')
jest.mock('../../../utils/response')
jest.mock('../../../utils/logger')

describe('Purchase Controller Edge Cases', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    ;(razorpay as any) = {
      orders: {
        create: jest.fn(),
      },
      payments: {
        fetch: jest.fn(),
      },
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createCheckoutSession edge cases', () => {
    it('should handle Razorpay not configured', async () => {
      ;(razorpay as any) = null
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.body = {
        purchaseType: 'service',
        serviceId: 'service123',
      }

      await createCheckoutSession(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(InternalServerError))
    })

    it('should handle service not found', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.body = {
        purchaseType: 'service',
        serviceId: 'nonexistent',
      }

      jest.spyOn(Service, 'findById').mockResolvedValue(null)

      await createCheckoutSession(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should handle course not found', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.body = {
        purchaseType: 'course',
        courseId: 'nonexistent',
      }

      jest.spyOn(Course, 'findById').mockResolvedValue(null)

      await createCheckoutSession(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should handle Razorpay order creation failure', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.body = {
        purchaseType: 'service',
        serviceId: 'service123',
      }

      jest.spyOn(Service, 'findById').mockResolvedValue({
        _id: 'service123',
        name: 'Test Service',
        price: 99.99,
      } as any)

      ;(razorpay!.orders.create as jest.Mock).mockRejectedValue(new Error('Razorpay error'))

      await createCheckoutSession(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('verifyPayment edge cases', () => {
    it('should handle purchase not found', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.body = {
        razorpay_order_id: 'order123',
        razorpay_payment_id: 'payment123',
        razorpay_signature: 'signature123',
      }

      jest.spyOn(Purchase, 'findOne').mockResolvedValue(null)

      await verifyPayment(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should handle purchase already completed', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.body = {
        razorpay_order_id: 'order123',
        razorpay_payment_id: 'payment123',
        razorpay_signature: 'signature123',
      }

      jest.spyOn(Purchase, 'findOne').mockResolvedValue({
        _id: 'purchase123',
        user: 'user123',
        status: 'completed',
        save: jest.fn(),
      } as any)

      await verifyPayment(mockRequest as Request, mockResponse as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })
  })

  describe('getPurchaseStatus edge cases', () => {
    it('should handle missing orderId', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.params = {}

      await getPurchaseStatus(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should handle purchase not found', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.params = { orderId: 'nonexistent' }

      jest.spyOn(Purchase, 'findOne').mockResolvedValue(null)

      await getPurchaseStatus(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('handleWebhook edge cases', () => {
    it('should handle Razorpay not configured', async () => {
      ;(razorpay as any) = null

      await handleWebhook(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(InternalServerError))
    })

    it('should handle missing webhook signature', async () => {
      ;(razorpay as any) = { orders: { create: jest.fn() } }
      mockRequest.headers = {}

      await handleWebhook(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
    })

    it('should handle invalid webhook signature', async () => {
      ;(razorpay as any) = { orders: { create: jest.fn() } }
      mockRequest.headers = {
        'x-razorpay-signature': 'invalid-signature',
      }
      mockRequest.body = { event: 'payment.captured' }
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test-secret'

      await handleWebhook(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
    })

    it('should handle unknown webhook event', async () => {
      ;(razorpay as any) = { orders: { create: jest.fn() } }
      mockRequest.headers = {
        'x-razorpay-signature': 'valid-signature',
      }
      mockRequest.body = { event: 'unknown.event' }
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test-secret'

      // Mock crypto to return matching signature
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', 'test-secret')
        .update(JSON.stringify(mockRequest.body))
        .digest('hex')
      mockRequest.headers['x-razorpay-signature'] = expectedSignature

      await handleWebhook(mockRequest as Request, mockResponse as Response, mockNext)

      // Should handle gracefully
      expect(mockResponse.status).toHaveBeenCalledWith(200)
    })

    it('should handle payment.captured event with purchase not found', async () => {
      ;(razorpay as any) = { orders: { create: jest.fn() } }
      mockRequest.headers = {
        'x-razorpay-signature': 'valid-signature',
      }
      mockRequest.body = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'payment123',
              order_id: 'order123',
            },
          },
        },
      }
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test-secret'

      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', 'test-secret')
        .update(JSON.stringify(mockRequest.body))
        .digest('hex')
      mockRequest.headers['x-razorpay-signature'] = expectedSignature

      jest.spyOn(Purchase, 'findOne').mockResolvedValue(null)

      await handleWebhook(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
    })

    it('should handle webhook without secret (skip verification)', async () => {
      ;(razorpay as any) = { orders: { create: jest.fn() } }
      mockRequest.headers = {
        'x-razorpay-signature': 'any-signature',
      }
      mockRequest.body = { event: 'payment.captured' }
      delete process.env.RAZORPAY_WEBHOOK_SECRET

      await handleWebhook(mockRequest as Request, mockResponse as Response, mockNext)

      // Should proceed without verification
      expect(mockResponse.status).toHaveBeenCalledWith(200)
    })
  })

  describe('getPurchases edge cases', () => {
    it('should handle pagination edge cases', async () => {
      ;(mockRequest as any).authUser = { sub: 'user123' }
      mockRequest.query = {
        page: '0',
        limit: '0',
      }

      jest.spyOn(Purchase, 'find').mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any)

      await getPurchases(mockRequest as Request, mockResponse as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })
  })
})
