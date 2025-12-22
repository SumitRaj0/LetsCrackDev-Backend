/**
 * Enhanced Purchase Controller Tests
 * Covers previously untested paths to achieve 90%+ coverage
 */

import request from 'supertest'
import app from '../../../app'
import { User } from '../../../modules/auth/user.model'
import { Service } from '../../../modules/services/service.model'
import { Course } from '../../../modules/courses/course.model'
import { Purchase } from '../../../modules/purchases/purchase.model'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

describe('Purchase Controller - Enhanced Coverage', () => {
  let accessToken: string
  let userId: string
  let testServiceId: string
  let testCourseId: string

  beforeEach(async () => {
    // Create test user with a suite-specific email to avoid collisions with other tests
    const testUser = await User.create({
      name: 'Test User',
      email: 'purchase.user@example.com',
      passwordHash: await bcrypt.hash('Test123!@#', 10),
      role: 'user',
      isPremium: false,
    })
    userId = testUser._id.toString()

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'purchase.user@example.com',
        password: 'Test123!@#',
      })

    accessToken = loginResponse.body.data.accessToken

    // Create test service
    const testService = await Service.create({
      name: 'Test Service',
      description: 'Test service description',
      price: 99.99,
      category: 'resume',
      slug: 'test-service',
      createdBy: userId,
    })
    testServiceId = testService._id.toString()

    // Create test course
    const testCourse = await Course.create({
      title: 'Test Course',
      description: 'Test course description',
      price: 149.99,
      category: 'Web Development',
      createdBy: userId,
      difficulty: 'beginner',
    })
    testCourseId = testCourse._id.toString()
  })

  afterEach(async () => {
    await User.deleteMany({})
    await Service.deleteMany({})
    await Course.deleteMany({})
    await Purchase.deleteMany({})
  })

  describe('createCheckoutSession - Enhanced', () => {
    it('should handle missing serviceId for service purchase', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'service',
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('serviceId is required')
    })

    it('should handle missing courseId for course purchase', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'course',
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('courseId is required')
    })

    it('should handle service not found', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'service',
          serviceId: '507f1f77bcf86cd799439011', // Non-existent ID
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Service not found')
    })

    it('should handle course not found', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'course',
          courseId: '507f1f77bcf86cd799439011', // Non-existent ID
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Course not found')
    })

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'invalid-type',
        })
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should handle service with deletedAt (soft deleted)', async () => {
      // Soft delete the service
      await Service.findByIdAndUpdate(testServiceId, {
        deletedAt: new Date(),
      })

      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'service',
          serviceId: testServiceId,
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Service not found')
    })

    it('should handle course with deletedAt (soft deleted)', async () => {
      // Soft delete the course
      await Course.findByIdAndUpdate(testCourseId, {
        deletedAt: new Date(),
      })

      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'course',
          courseId: testCourseId,
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Course not found')
    })

    it('should handle service with price <= 0', async () => {
      // Create a service with zero price
      const zeroPriceService = await Service.create({
        name: 'Free Service',
        description: 'Free service',
        price: 0,
        category: 'resume',
        slug: 'free-service',
        createdBy: userId,
      })

      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'service',
          serviceId: zeroPriceService._id.toString(),
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Item price must be greater than 0')
    })

    it('should handle course with price <= 0', async () => {
      // Create a course with zero price
      const zeroPriceCourse = await Course.create({
        title: 'Free Course',
        description: 'Free course',
        price: 0,
        category: 'Web Development',
        createdBy: userId,
        difficulty: 'beginner',
      })

      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'course',
          courseId: zeroPriceCourse._id.toString(),
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Item price must be greater than 0')
    })

    it('should handle custom successUrl and cancelUrl', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'service',
          serviceId: testServiceId,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.successUrl).toBe('https://example.com/success')
      expect(response.body.data.cancelUrl).toBe('https://example.com/cancel')
    })

    it('should handle user not found scenario', async () => {
      // Delete the user but keep the token (simulating user deleted after login)
      await User.findByIdAndDelete(userId)

      const response = await request(app)
        .post('/api/v1/purchases/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          purchaseType: 'service',
          serviceId: testServiceId,
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('User not found')
    })
  })

  describe('verifyPayment - Enhanced', () => {
    beforeEach(async () => {
      // Create a purchase for the first test
      await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: testCourseId,
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_test123',
      })
    })

    it('should handle non-premium course purchase (should not update premium status)', async () => {
      const orderId = 'order_test123'
      const paymentId = 'pay_test123'
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test-secret'
      const text = `${orderId}|${paymentId}`
      const signature = crypto.createHmac('sha256', secret).update(text).digest('hex')

      const userBefore = await User.findById(userId)
      const wasPremiumBefore = userBefore?.isPremium

      const response = await request(app)
        .post('/api/v1/purchases/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.verified).toBe(true)

      // Verify user premium status was not changed for non-premium course
      const userAfter = await User.findById(userId)
      expect(userAfter?.isPremium).toBe(wasPremiumBefore)
    })

    it('should handle premium course purchase and update user premium status', async () => {
      // Create premium course
      const premiumCourse = await Course.create({
        title: 'Premium Course',
        description: 'Premium course description',
        price: 299.99,
        category: 'Web Development',
        createdBy: userId,
        difficulty: 'beginner',
        isPremium: true,
      })

      // Create purchase for premium course
      const premiumPurchase = await Purchase.create({
        user: userId,
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

      const response = await request(app)
        .post('/api/v1/purchases/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.verified).toBe(true)

      // Verify purchase was updated
      const updatedPurchase = await Purchase.findById(premiumPurchase._id)
      expect(updatedPurchase?.status).toBe('completed')

      // Verify user premium status was updated
      const userAfter = await User.findById(userId)
      expect(userAfter?.isPremium).toBe(true)
      expect(userAfter?.premiumExpiresAt).toBeDefined()
    })

    it('should handle course not found when updating premium status', async () => {
      // Create purchase with non-existent course
      await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: '507f1f77bcf86cd799439011', // Non-existent course ID
        amount: 299.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_invalid_course',
      })

      const orderId = 'order_invalid_course'
      const paymentId = 'pay_invalid_course'
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test-secret'
      const text = `${orderId}|${paymentId}`
      const signature = crypto.createHmac('sha256', secret).update(text).digest('hex')

      // Should still succeed (course not found is handled gracefully)
      const response = await request(app)
        .post('/api/v1/purchases/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        })
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('handleWebhook - Enhanced', () => {
    it('should handle premium course purchase via webhook', async () => {
      // Create premium course
      const premiumCourse = await Course.create({
        title: 'Premium Course',
        description: 'Premium course description',
        price: 299.99,
        category: 'Web Development',
        createdBy: userId,
        difficulty: 'beginner',
        isPremium: true,
      })

      // Create purchase for premium course
      const premiumPurchase = await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: premiumCourse._id,
        amount: 299.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_webhook_premium',
      })

      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_premium',
              order_id: 'order_webhook_premium',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(200)

      expect(response.body.received).toBe(true)

      // Verify purchase was updated
      const updatedPurchase = await Purchase.findById(premiumPurchase._id)
      expect(updatedPurchase?.status).toBe('completed')
      expect(updatedPurchase?.razorpayPaymentId).toBe('pay_webhook_premium')

      // Verify user premium status was updated
      const userAfter = await User.findById(userId)
      expect(userAfter?.isPremium).toBe(true)
      expect(userAfter?.premiumExpiresAt).toBeDefined()
    })

    it('should handle payment.captured event when purchase status is not pending', async () => {
      // Create purchase with completed status
      const completedPurchase = await Purchase.create({
        user: userId,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
        razorpayOrderId: 'order_already_completed',
      })

      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_already_completed',
              order_id: 'order_already_completed',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(200)

      expect(response.body.received).toBe(true)

      // Verify purchase status remains completed (not changed)
      const updatedPurchase = await Purchase.findById(completedPurchase._id)
      expect(updatedPurchase?.status).toBe('completed')
    })

    it('should handle order.paid event when purchase status is not pending', async () => {
      // Create purchase with completed status
      const completedPurchase = await Purchase.create({
        user: userId,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
        razorpayOrderId: 'order_paid_already_completed',
      })

      const webhookBody = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: 'order_paid_already_completed',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(200)

      expect(response.body.received).toBe(true)

      // Verify purchase status remains completed (not changed)
      const updatedPurchase = await Purchase.findById(completedPurchase._id)
      expect(updatedPurchase?.status).toBe('completed')
    })

    it('should handle webhook error gracefully', async () => {
      // Create a webhook body that might cause an error
      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_error_test',
              order_id: 'order_error_test',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      // Mock Purchase.findOne to throw an error using jest.spyOn
      const findOneSpy = jest
        .spyOn(Purchase, 'findOne')
        .mockRejectedValueOnce(new Error('Database error'))

      await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(500)

      // Restore spy
      findOneSpy.mockRestore()
    })

    it('should handle payment.captured event with non-premium course', async () => {
      // Create purchase for non-premium course
      const purchase = await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: testCourseId,
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_webhook_non_premium',
      })

      const userBefore = await User.findById(userId)
      const wasPremiumBefore = userBefore?.isPremium

      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_non_premium',
              order_id: 'order_webhook_non_premium',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(200)

      expect(response.body.received).toBe(true)

      // Verify purchase was updated
      const updatedPurchase = await Purchase.findById(purchase._id)
      expect(updatedPurchase?.status).toBe('completed')

      // Verify user premium status was not changed for non-premium course
      const userAfter = await User.findById(userId)
      expect(userAfter?.isPremium).toBe(wasPremiumBefore)
    })

    it('should handle user not found in webhook payment.captured event', async () => {
      // Create purchase
      const purchase = await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: testCourseId,
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_webhook_no_user',
      })

      // Delete the user
      await User.findByIdAndDelete(userId)

      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_no_user',
              order_id: 'order_webhook_no_user',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      // Should still return 200 (webhook should handle gracefully)
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(200)

      expect(response.body.received).toBe(true)

      // Verify purchase was still updated
      const updatedPurchase = await Purchase.findById(purchase._id)
      expect(updatedPurchase?.status).toBe('completed')
    })

    it('should handle course not found in webhook payment.captured event', async () => {
      // Create purchase with non-existent course
      const purchase = await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: '507f1f77bcf86cd799439011', // Non-existent course ID
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_webhook_no_course',
      })

      const webhookBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_no_course',
              order_id: 'order_webhook_no_course',
            },
          },
        },
      }

      const webhookBodyString = JSON.stringify(webhookBody)
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(webhookBodyString)
        .digest('hex')

      // Should still return 200 (webhook should handle gracefully)
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookBody)
        .expect(200)

      expect(response.body.received).toBe(true)

      // Verify purchase was still updated
      const updatedPurchase = await Purchase.findById(purchase._id)
      expect(updatedPurchase?.status).toBe('completed')
    })
  })

  describe('getPurchases - Enhanced', () => {
    beforeEach(async () => {
      // Create multiple purchases for testing
      await Purchase.create({
        user: userId,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'completed',
      })
      await Purchase.create({
        user: userId,
        purchaseType: 'course',
        courseId: testCourseId,
        amount: 149.99,
        currency: 'INR',
        status: 'pending',
      })
      await Purchase.create({
        user: userId,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 99.99,
        currency: 'INR',
        status: 'failed',
      })
    })

    it('should handle pagination with hasNextPage and hasPrevPage correctly', async () => {
      // Test first page
      const response1 = await request(app)
        .get('/api/v1/purchases?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response1.body.success).toBe(true)
      expect(response1.body.data.pagination.page).toBe(1)
      expect(response1.body.data.pagination.limit).toBe(2)
      expect(response1.body.data.pagination.hasNextPage).toBe(true)
      expect(response1.body.data.pagination.hasPrevPage).toBe(false)

      // Test second page
      const response2 = await request(app)
        .get('/api/v1/purchases?page=2&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response2.body.success).toBe(true)
      expect(response2.body.data.pagination.page).toBe(2)
      expect(response2.body.data.pagination.hasNextPage).toBe(false)
      expect(response2.body.data.pagination.hasPrevPage).toBe(true)
    })

    it('should handle combined filters (status and purchaseType)', async () => {
      const response = await request(app)
        .get('/api/v1/purchases?status=completed&purchaseType=service')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.purchases.length).toBeGreaterThan(0)
      response.body.data.purchases.forEach((purchase: any) => {
        expect(purchase.status).toBe('completed')
        expect(purchase.purchaseType).toBe('service')
      })
    })
  })
})
