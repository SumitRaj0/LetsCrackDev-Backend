/**
 * Purchase Controller Tests
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { Purchase } from '@/modules/purchases/purchase.model'
import { Service } from '@/modules/services/service.model'
import { Course } from '@/modules/courses/course.model'
import { User } from '@/modules/auth/user.model'
import {
  createCheckoutSession,
  verifyPayment,
  getPurchaseStatus,
  handleWebhook,
  getPurchases,
  getPurchaseById,
} from '@/modules/purchases/purchase.controller'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'

jest.mock('../../../utils/response')
jest.mock('../../../utils/logger')

// Mock Razorpay
jest.mock('../../../config/razorpay', () => {
  const mockRazorpayOrders = {
    create: jest.fn(),
  }
  return {
    razorpay: {
      orders: mockRazorpayOrders,
    },
    RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
    RAZORPAY_CONFIG: {
      currency: 'INR',
      defaultSuccessUrl: 'http://localhost:5173/payment/success',
      defaultCancelUrl: 'http://localhost:5173/payment/cancel',
    },
  }
})

describe('Purchase Controller', () => {
  let mockReq: Partial<Request & { authUser?: { sub?: string; email?: string; role?: string } }>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let testUser: any
  let testService: any
  let testCourse: any

  beforeEach(async () => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
      authUser: { sub: '', email: 'test@example.com', role: 'user' },
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'user',
    })
    mockReq.authUser!.sub = testUser._id.toString()

    // Create test service
    testService = await Service.create({
      name: 'Test Service',
      description: 'Test service description that is long enough',
      price: 199.99,
      category: 'resume',
      slug: 'test-service',
      createdBy: testUser._id,
    })

    // Create test course
    testCourse = await Course.create({
      title: 'Test Course',
      description: 'Test course description that is long enough',
      price: 99.99,
      category: 'Web Development',
      difficulty: 'beginner',
      createdBy: testUser._id,
    })
  })

  afterEach(async () => {
    await Purchase.deleteMany({})
    await Service.deleteMany({})
    await Course.deleteMany({})
    await User.deleteMany({})
    jest.clearAllMocks()
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session for service successfully', async () => {
      const mockRazorpay = require('../../../config/razorpay')
      mockRazorpay.razorpay.orders.create.mockResolvedValue({
        id: 'order_test123',
        amount: 19999,
        currency: 'INR',
      })

      mockReq.body = {
        purchaseType: 'service',
        serviceId: testService._id.toString(),
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          orderId: 'order_test123',
          amount: 19999,
          currency: 'INR',
          purchaseId: expect.any(String),
        }),
        'Order created successfully',
        201
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should create checkout session for course successfully', async () => {
      const mockRazorpay = require('../../../config/razorpay')
      mockRazorpay.razorpay.orders.create.mockResolvedValue({
        id: 'order_test456',
        amount: 9999,
        currency: 'INR',
      })

      mockReq.body = {
        purchaseType: 'course',
        courseId: testCourse._id.toString(),
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.body = {
        purchaseType: 'service',
        serviceId: testService._id.toString(),
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError when serviceId is missing for service purchase', async () => {
      mockReq.body = {
        purchaseType: 'service',
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw ValidationError when courseId is missing for course purchase', async () => {
      mockReq.body = {
        purchaseType: 'course',
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when service does not exist', async () => {
      mockReq.body = {
        purchaseType: 'service',
        serviceId: new mongoose.Types.ObjectId().toString(),
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should throw NotFoundError when course does not exist', async () => {
      mockReq.body = {
        purchaseType: 'course',
        courseId: new mongoose.Types.ObjectId().toString(),
      }

      await createCheckoutSession(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('verifyPayment', () => {
    let testPurchase: any

    beforeEach(async () => {
      testPurchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 199.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })
    })

    it('should verify payment successfully', async () => {
      const orderId = 'order_test123'
      const paymentId = 'pay_test123'
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test-secret'
      const text = `${orderId}|${paymentId}`
      const signature = crypto.createHmac('sha256', secret).update(text).digest('hex')

      mockReq.body = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          purchase: expect.objectContaining({
            status: 'completed',
          }),
          verified: true,
        }),
        'Payment verified successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()

      // Verify purchase was updated
      const updatedPurchase = await Purchase.findById(testPurchase._id)
      expect(updatedPurchase?.status).toBe('completed')
      expect(updatedPurchase?.razorpayPaymentId).toBe(paymentId)
    })

    it('should update user premium status for premium course purchase', async () => {
      // Create premium course
      const premiumCourse = await Course.create({
        title: 'Premium Course',
        description: 'Premium course description',
        price: 299.99,
        category: 'Web Development',
        difficulty: 'beginner',
        isPremium: true,
        createdBy: testUser._id,
      })

      // Create purchase for premium course
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'course',
        courseId: premiumCourse._id,
        amount: 299.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_premium123',
      })

      const orderId = 'order_premium123'
      const paymentId = 'pay_premium123'
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test-secret'
      const text = `${orderId}|${paymentId}`
      const signature = crypto.createHmac('sha256', secret).update(text).digest('hex')

      mockReq.body = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      // Verify user premium status was updated
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.isPremium).toBe(true)
      expect(updatedUser?.premiumExpiresAt).toBeDefined()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.body = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature',
      }

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError when payment data is missing', async () => {
      mockReq.body = {}

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when purchase does not exist', async () => {
      mockReq.body = {
        razorpay_order_id: 'non-existent-order',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature',
      }

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should throw BadRequestError when payment already verified', async () => {
      testPurchase.status = 'completed'
      await testPurchase.save()

      mockReq.body = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'signature',
      }

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
    })

    it('should throw BadRequestError when signature is invalid', async () => {
      mockReq.body = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'invalid-signature',
      }

      await verifyPayment(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))

      // Verify purchase status was set to failed
      const updatedPurchase = await Purchase.findById(testPurchase._id)
      expect(updatedPurchase?.status).toBe('failed')
    })
  })

  describe('getPurchaseStatus', () => {
    beforeEach(async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 199.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })
    })

    it('should get purchase status successfully', async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 199.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })

      mockReq.params = { orderId: 'order_test123' }

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          orderId: 'order_test123',
          status: 'pending',
          amount: 199.99,
          currency: 'INR',
        }),
        'Purchase status retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { orderId: 'order_test123' }

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError when orderId is missing', async () => {
      mockReq.params = {}

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when purchase does not exist', async () => {
      mockReq.params = { orderId: 'non-existent-order' }

      await getPurchaseStatus(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('getPurchases', () => {
    beforeEach(async () => {
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 199.99,
        currency: 'INR',
        status: 'completed',
      })
      await Purchase.create({
        user: testUser._id,
        purchaseType: 'course',
        courseId: testCourse._id,
        amount: 99.99,
        currency: 'INR',
        status: 'pending',
      })
    })

    it('should get all purchases with default pagination', async () => {
      mockReq.query = {}

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          purchases: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
          }),
        }),
        'Purchases retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should filter purchases by status', async () => {
      mockReq.query = { status: 'completed' }

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const purchases = callArgs[1].purchases
      expect(purchases.every((p: any) => p.status === 'completed')).toBe(true)
    })

    it('should filter purchases by purchaseType', async () => {
      mockReq.query = { purchaseType: 'service' }

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const purchases = callArgs[1].purchases
      expect(purchases.every((p: any) => p.purchaseType === 'service')).toBe(true)
    })

    it('should handle pagination correctly', async () => {
      mockReq.query = { page: '1', limit: '1' }

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      expect(callArgs[1].pagination.page).toBe(1)
      expect(callArgs[1].pagination.limit).toBe(1)
      expect(callArgs[1].purchases.length).toBe(1)
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.query = {}

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError when query parameters are invalid', async () => {
      mockReq.query = { page: 'invalid', limit: 'invalid' }

      await getPurchases(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('getPurchaseById', () => {
    let testPurchase: any

    beforeEach(async () => {
      testPurchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'service',
        serviceId: testService._id,
        amount: 199.99,
        currency: 'INR',
        status: 'completed',
      })
    })

    it('should get purchase by ID successfully', async () => {
      mockReq.params = { id: testPurchase._id.toString() }

      await getPurchaseById(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          purchase: expect.objectContaining({
            _id: testPurchase._id,
          }),
        }),
        'Purchase retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testPurchase._id.toString() }

      await getPurchaseById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError when ID is invalid', async () => {
      mockReq.params = { id: 'invalid-id' }

      await getPurchaseById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when purchase does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }

      await getPurchaseById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('handleWebhook', () => {
    let testPurchase: any

    beforeEach(async () => {
      testPurchase = await Purchase.create({
        user: testUser._id,
        purchaseType: 'course',
        courseId: testCourse._id,
        amount: 99.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_webhook123',
      })
    })

    it('should handle payment.captured event successfully', async () => {
      const webhookBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook123',
              order_id: 'order_webhook123',
            },
          },
        },
      })
      const secret = 'test-webhook-secret'
      const signature = crypto.createHmac('sha256', secret).update(webhookBody).digest('hex')

      mockReq.headers = {
        'x-razorpay-signature': signature,
      }
      mockReq.body = JSON.parse(webhookBody)

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({ received: true })
      expect(mockNext).not.toHaveBeenCalled()

      // Verify purchase was updated
      const updatedPurchase = await Purchase.findById(testPurchase._id)
      expect(updatedPurchase?.status).toBe('completed')
      expect(updatedPurchase?.razorpayPaymentId).toBe('pay_webhook123')
    })

    it('should handle payment.failed event', async () => {
      const webhookBody = JSON.stringify({
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed123',
              order_id: 'order_webhook123',
            },
          },
        },
      })
      const secret = 'test-webhook-secret'
      const signature = crypto.createHmac('sha256', secret).update(webhookBody).digest('hex')

      mockReq.headers = {
        'x-razorpay-signature': signature,
      }
      mockReq.body = JSON.parse(webhookBody)

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      
      // Verify purchase status was set to failed
      const updatedPurchase = await Purchase.findById(testPurchase._id)
      expect(updatedPurchase?.status).toBe('failed')
    })

    it('should throw BadRequestError when signature is missing', async () => {
      mockReq.headers = {}
      mockReq.body = {
        event: 'payment.captured',
        payload: {},
      }

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
    })

    it('should throw BadRequestError when signature is invalid', async () => {
      mockReq.headers = {
        'x-razorpay-signature': 'invalid-signature',
      }
      mockReq.body = {
        event: 'payment.captured',
        payload: {},
      }

      await handleWebhook(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
    })
  })
})
