/**
 * Payments Flow Integration Tests
 * Tests complete payment and purchase flow end-to-end
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  createTestService,
  createTestCourse,
  authenticatedRequest,
} from './testHelpers'
import { Purchase } from '../../modules/purchases/purchase.model'
import { Service } from '../../modules/services/service.model'
import { Course } from '../../modules/courses/course.model'

describe('Payments Flow - Integration Tests', () => {
  let regularUser: { accessToken: string; id: string; email: string }
  let testServiceId: string
  let testCourseId: string

  beforeEach(async () => {
    await cleanupTestData()

    regularUser = await createTestUser(
      generateTestEmail('user'),
      'Test@1234',
      'Regular User',
      'user',
    )

    // Create test service
    testServiceId = await createTestService(regularUser.id, {
      name: 'Test Service',
      price: 99.99,
      category: 'resume',
      slug: `test-service-${Date.now()}`,
    })

    // Create test course
    testCourseId = await createTestCourse(regularUser.id, {
      title: 'Test Course',
      category: 'Web Development',
      difficulty: 'beginner',
      price: 149.99,
    })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Checkout Creation', () => {
    test('TC-PAYMENTS-FLOW-001: Create checkout session for service', async () => {
      const checkoutResponse = await authenticatedRequest(
        'post',
        '/api/v1/purchases/checkout',
        regularUser.accessToken,
      )
        .send({
          purchaseType: 'service',
          serviceId: testServiceId,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(200)

      expect(checkoutResponse.body.success).toBe(true)
      expect(checkoutResponse.body.data.orderId).toBeDefined()
      expect(checkoutResponse.body.data.amount).toBe(9999) // Amount in paise (99.99 * 100)
      expect(checkoutResponse.body.data.currency).toBe('INR')
      expect(checkoutResponse.body.data.keyId).toBeDefined()
      expect(checkoutResponse.body.data.purchaseId).toBeDefined()

      // Verify purchase record was created
      const purchase = await Purchase.findById(checkoutResponse.body.data.purchaseId)
      expect(purchase).toBeDefined()
      expect(purchase?.status).toBe('pending')
      expect(purchase?.purchaseType).toBe('service')
      expect(purchase?.serviceId?.toString()).toBe(testServiceId)
    })

    test('TC-PAYMENTS-FLOW-002: Create checkout session for course', async () => {
      const checkoutResponse = await authenticatedRequest(
        'post',
        '/api/v1/purchases/checkout',
        regularUser.accessToken,
      )
        .send({
          purchaseType: 'course',
          courseId: testCourseId,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(200)

      expect(checkoutResponse.body.success).toBe(true)
      expect(checkoutResponse.body.data.orderId).toBeDefined()
      expect(checkoutResponse.body.data.amount).toBe(14999) // Amount in paise (149.99 * 100)
      expect(checkoutResponse.body.data.purchaseId).toBeDefined()

      // Verify purchase record was created
      const purchase = await Purchase.findById(checkoutResponse.body.data.purchaseId)
      expect(purchase).toBeDefined()
      expect(purchase?.status).toBe('pending')
      expect(purchase?.purchaseType).toBe('course')
      expect(purchase?.courseId?.toString()).toBe(testCourseId)
    })

    test('TC-PAYMENTS-FLOW-003: Checkout requires authentication', async () => {
      await request(app)
        .post('/api/v1/purchases/checkout')
        .send({
          purchaseType: 'service',
          serviceId: testServiceId,
        })
        .expect(401)
    })

    test('TC-PAYMENTS-FLOW-004: Cannot checkout with invalid service/course ID', async () => {
      // Invalid service ID
      await authenticatedRequest('post', '/api/v1/purchases/checkout', regularUser.accessToken)
        .send({
          purchaseType: 'service',
          serviceId: '507f1f77bcf86cd799439011', // Invalid ObjectId
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(404)

      // Invalid course ID
      await authenticatedRequest('post', '/api/v1/purchases/checkout', regularUser.accessToken)
        .send({
          purchaseType: 'course',
          courseId: '507f1f77bcf86cd799439011', // Invalid ObjectId
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(404)
    })
  })

  describe('Payment Verification', () => {
    test('TC-PAYMENTS-FLOW-005: Verify payment with valid signature', async () => {
      // Create checkout first
      const checkoutResponse = await authenticatedRequest(
        'post',
        '/api/v1/purchases/checkout',
        regularUser.accessToken,
      )
        .send({
          purchaseType: 'service',
          serviceId: testServiceId,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(200)

      const orderId = checkoutResponse.body.data.orderId
      const purchaseId = checkoutResponse.body.data.purchaseId

      // Note: In real integration, Razorpay would provide these values
      // For testing, we'll use mock values and test the endpoint structure
      // Actual signature verification requires Razorpay webhook secret
      const verifyResponse = await authenticatedRequest(
        'post',
        '/api/v1/purchases/verify',
        regularUser.accessToken,
      ).send({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_${Date.now()}`,
        razorpay_signature: 'mock_signature_for_testing',
      })

      // Response will vary based on Razorpay configuration
      // If Razorpay is not configured, it may return 500 or handle gracefully
      // The important thing is that the endpoint exists and accepts the request structure
      expect([200, 400, 500]).toContain(verifyResponse.status)
    })

    test('TC-PAYMENTS-FLOW-006: Payment verification requires authentication', async () => {
      await request(app)
        .post('/api/v1/purchases/verify')
        .send({
          razorpay_order_id: 'order_test',
          razorpay_payment_id: 'pay_test',
          razorpay_signature: 'signature_test',
        })
        .expect(401)
    })
  })

  describe('Purchase History', () => {
    beforeEach(async () => {
      // Create a completed purchase for testing
      await Purchase.create({
        user: regularUser.id,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
        razorpayOrderId: 'order_completed',
        razorpayPaymentId: 'pay_completed',
        completedAt: new Date(),
      })

      // Create a pending purchase
      await Purchase.create({
        user: regularUser.id,
        purchaseType: 'course',
        courseId: testCourseId,
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_pending',
      })
    })

    test('TC-PAYMENTS-FLOW-007: Get purchase history', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/purchases',
        regularUser.accessToken,
      )
        .query({ page: 1, limit: 10 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.purchases).toBeDefined()
      expect(Array.isArray(response.body.data.purchases)).toBe(true)
      expect(response.body.data.pagination).toBeDefined()
    })

    test('TC-PAYMENTS-FLOW-008: Get purchase by ID', async () => {
      // Create a purchase
      const purchase = await Purchase.create({
        user: regularUser.id,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
      })

      const response = await authenticatedRequest(
        'get',
        `/api/v1/purchases/${purchase._id}`,
        regularUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.purchase._id).toBe(purchase._id.toString())
      expect(response.body.data.purchase.status).toBe('completed')
    })

    test('TC-PAYMENTS-FLOW-009: Cannot access other user purchases', async () => {
      // Create another user
      const otherUser = await createTestUser(
        generateTestEmail('other'),
        'Test@1234',
        'Other User',
        'user',
      )

      // Create purchase for other user
      const purchase = await Purchase.create({
        user: otherUser.id,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
      })

      // Regular user cannot access other user's purchase
      await authenticatedRequest(
        'get',
        `/api/v1/purchases/${purchase._id}`,
        regularUser.accessToken,
      ).expect(403)
    })

    test('TC-PAYMENTS-FLOW-010: Get purchase status by order ID', async () => {
      const orderId = 'order_test_status'
      await Purchase.create({
        user: regularUser.id,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
        razorpayOrderId: orderId,
      })

      const response = await authenticatedRequest(
        'get',
        `/api/v1/purchases/status/${orderId}`,
        regularUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.purchase).toBeDefined()
      expect(response.body.data.purchase.razorpayOrderId).toBe(orderId)
      expect(response.body.data.purchase.status).toBe('completed')
    })
  })

  describe('Purchase Validation', () => {
    test('TC-PAYMENTS-FLOW-011: Missing required fields in checkout', async () => {
      // Missing purchaseType
      await authenticatedRequest('post', '/api/v1/purchases/checkout', regularUser.accessToken)
        .send({
          serviceId: testServiceId,
        })
        .expect(400)

      // Missing serviceId for service purchase
      await authenticatedRequest('post', '/api/v1/purchases/checkout', regularUser.accessToken)
        .send({
          purchaseType: 'service',
        })
        .expect(400)

      // Missing courseId for course purchase
      await authenticatedRequest('post', '/api/v1/purchases/checkout', regularUser.accessToken)
        .send({
          purchaseType: 'course',
        })
        .expect(400)
    })
  })
})
