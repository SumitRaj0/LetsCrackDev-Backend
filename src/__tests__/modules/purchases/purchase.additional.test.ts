/**
 * Additional Purchase Controller Tests
 * Tests for getPurchaseStatus, getPurchases, getPurchaseById, handleWebhook edge cases
 */

import { Request, Response, NextFunction } from 'express'
import { Purchase } from '../../../modules/purchases/purchase.model'
import { User } from '../../../modules/auth/user.model'
import { Service } from '../../../modules/services/service.model'
import { Course } from '../../../modules/courses/course.model'
import {
  getPurchaseStatus,
  getPurchases,
  getPurchaseById,
  handleWebhook,
} from '../../../modules/purchases/purchase.controller'
import { sendResponse } from '../../../utils/response'
import { RAZORPAY_WEBHOOK_SECRET } from '../../../config/razorpay'
import crypto from 'crypto'

jest.mock('../../../utils/response')
jest.mock('../../../utils/logger')
jest.mock('../../../config/razorpay', () => ({
  razorpay: {
    orders: {
      create: jest.fn(),
      fetch: jest.fn(),
    },
    payments: {
      fetch: jest.fn(),
    },
  },
  RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
  RAZORPAY_CONFIG: {
    currency: 'INR',
    defaultSuccessUrl: 'http://localhost:5173/success',
    defaultCancelUrl: 'http://localhost:5173/cancel',
  },
}))

describe('Additional Purchase Controller Tests', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let testUser: any
  let testService: any
  let testCourse: any

  beforeEach(async () => {
    await Purchase.deleteMany({})
    await User.deleteMany({})
    await Service.deleteMany({})
    await Course.deleteMany({})
    jest.clearAllMocks()

    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed',
      role: 'user',
    })

    testService = await Service.create({
      name: 'Test Service',
      description: 'Test Description',
      price: 99.99,
      category: 'resume',
      slug: 'test-service',
      createdBy: testUser._id,
    })

    testCourse = await Course.create({
      title: 'Test Course',
      description: 'Test Description',
      price: 149.99,
      category: 'Web Development',
      createdBy: testUser._id,
    })

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }

    mockNext = jest.fn()
  })

  describe('getPurchaseStatus', () => {
    it('should get purchase status successfully', async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
        razorpayOrderId: 'order_test123',
      })

      mockReq = {
        params: { orderId: 'order_test123' },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })

    it('should throw NotFoundError when purchase not found', async () => {
      mockReq = {
        params: { orderId: 'nonexistent' },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq = {
        params: { orderId: 'order_test123' },
        authUser: undefined,
      } as any

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('getPurchases', () => {
    it('should get purchases with pagination', async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
      })

      mockReq = {
        query: { page: '1', limit: '10' },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })

    it('should filter by status', async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
      })

      mockReq = {
        query: { status: 'completed' },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })

    it('should filter by purchaseType', async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'course',
        courseId: testCourse._id,
        amount: 149.99,
        currency: 'INR',
        status: 'completed',
      })

      mockReq = {
        query: { purchaseType: 'course' },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })
  })

  describe('getPurchaseById', () => {
    it('should get purchase by ID successfully', async () => {
      const purchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
      })

      mockReq = {
        params: { id: purchase._id.toString() },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchaseById(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
    })

    it('should throw ValidationError for invalid ID', async () => {
      mockReq = {
        params: { id: 'invalid-id' },
        authUser: { sub: testUser._id.toString() },
      } as any

      await getPurchaseById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('handleWebhook', () => {
    it('should handle payment.captured event', async () => {
      const purchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'course',
        courseId: testCourse._id,
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })

      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const signature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(webhookBodyString)
        .digest('hex')

      mockReq = {
        body: webhookBody,
        headers: {
          'x-razorpay-signature': signature,
        },
      } as any

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      const updatedPurchase = await Purchase.findById(purchase._id)
      expect(updatedPurchase?.status).toBe('completed')
    })

    it('should handle payment.failed event', async () => {
      const purchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 99.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })

      const webhookBody = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const signature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(webhookBodyString)
        .digest('hex')

      mockReq = {
        body: webhookBody,
        headers: {
          'x-razorpay-signature': signature,
        },
      } as any

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      const updatedPurchase = await Purchase.findById(purchase._id)
      expect(updatedPurchase?.status).toBe('failed')
    })

    it('should handle order.paid event', async () => {
      const purchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 99.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })

      const webhookBody = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: 'order_test123',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const signature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(webhookBodyString)
        .digest('hex')

      mockReq = {
        body: webhookBody,
        headers: {
          'x-razorpay-signature': signature,
        },
      } as any

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      const updatedPurchase = await Purchase.findById(purchase._id)
      expect(updatedPurchase?.status).toBe('completed')
    })

    it('should handle unhandled webhook events', async () => {
      const webhookBody = {
        event: 'unknown.event',
        payload: {},
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const signature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(webhookBodyString)
        .digest('hex')

      mockReq = {
        body: webhookBody,
        headers: {
          'x-razorpay-signature': signature,
        },
      } as any

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
    })
  })
})
