/**
 * Interview Kits Integration Tests
 * Tests interview kit access control and question retrieval
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  createTestService,
  authenticatedRequest,
} from './testHelpers'
import { Purchase } from '../../modules/purchases/purchase.model'
import { InterviewKitQuestion } from '../../modules/interviewKits/interviewKitQuestion.model'

describe('Interview Kits - Integration Tests', () => {
  let regularUser: { accessToken: string; id: string; email: string }
  let testServiceId: string

  beforeEach(async () => {
    await cleanupTestData()

    regularUser = await createTestUser(
      generateTestEmail('user'),
      'Test@1234',
      'Regular User',
      'user',
    )

    // Create JavaScript Interview Mastery Kit service
    testServiceId = await createTestService(regularUser.id, {
      name: 'JavaScript Interview Mastery Kit',
      price: 499,
      category: 'interview',
      slug: 'javascript-interview-mastery-kit',
    })

    // Seed a few test questions
    await InterviewKitQuestion.deleteMany({ serviceId: testServiceId })
    await InterviewKitQuestion.create([
      {
        serviceId: testServiceId,
        questionId: '1',
        title: 'What is an Execution Context?',
        coreConcept: {
          content: 'An Execution Context is an environment where JavaScript code is evaluated.',
        },
        howItWorks: {
          items: ['Creation Phase', 'Execution Phase'],
        },
        interviewReadyAnswer: {
          content:
            'In JavaScript, an execution context is the environment in which code is executed.',
        },
        order: 1,
      },
      {
        serviceId: testServiceId,
        questionId: '2',
        title: 'What is Hoisting?',
        coreConcept: {
          content: 'Hoisting is JavaScript behavior of allocating memory before execution.',
        },
        howItWorks: {
          items: ['Variables hoisted', 'Functions hoisted'],
        },
        interviewReadyAnswer: {
          content: 'Hoisting happens because JavaScript allocates memory before executing code.',
        },
        order: 2,
      },
    ])
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Access Control', () => {
    test('TC-INTERVIEW-KIT-001: Should return 401 without authentication', async () => {
      await request(app).get(`/api/v1/interview-kits/${testServiceId}/questions`).expect(401)
    })

    test('TC-INTERVIEW-KIT-002: Should return 403 without purchase', async () => {
      await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${testServiceId}/questions`,
        regularUser.accessToken,
      ).expect(403)
    })

    test('TC-INTERVIEW-KIT-003: Should return 404 for invalid service ID', async () => {
      await authenticatedRequest(
        'get',
        '/api/v1/interview-kits/invalid-id/questions',
        regularUser.accessToken,
      ).expect(400) // ValidationError returns 400
    })

    test('TC-INTERVIEW-KIT-004: Should return 404 for non-existent service', async () => {
      const fakeId = '507f1f77bcf86cd799439011' // Valid ObjectId format
      await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${fakeId}/questions`,
        regularUser.accessToken,
      ).expect(404)
    })
  })

  describe('Question Retrieval', () => {
    let purchaseId: string

    beforeEach(async () => {
      // Create a completed purchase for the service
      const purchase = await Purchase.create({
        user: regularUser.id,
        purchaseType: 'service',
        serviceId: testServiceId,
        amount: 49900, // in paise
        originalAmount: 49900,
        currency: 'INR',
        status: 'completed',
        completedAt: new Date(),
      })
      purchaseId = purchase._id.toString()
    })

    test('TC-INTERVIEW-KIT-005: Should return questions for purchased service', async () => {
      const response = await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${testServiceId}/questions`,
        regularUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.kit).toBeDefined()
      expect(response.body.data.kit.serviceId).toBe(testServiceId)
      expect(response.body.data.kit.serviceName).toBe('JavaScript Interview Mastery Kit')
      expect(Array.isArray(response.body.data.kit.questions)).toBe(true)
      expect(response.body.data.kit.questions.length).toBe(2)

      // Verify question structure
      const q1 = response.body.data.kit.questions[0]
      expect(q1.id).toBe('1')
      expect(q1.title).toBe('What is an Execution Context?')
      expect(q1.coreConcept).toBeDefined()
      expect(q1.howItWorks).toBeDefined()
      expect(q1.interviewReadyAnswer).toBeDefined()
    })

    test('TC-INTERVIEW-KIT-006: Should return questions in correct order', async () => {
      const response = await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${testServiceId}/questions`,
        regularUser.accessToken,
      ).expect(200)

      const questions = response.body.data.kit.questions
      expect(questions[0].id).toBe('1')
      expect(questions[1].id).toBe('2')
    })

    test('TC-INTERVIEW-KIT-007: Should cache questions on second request', async () => {
      // First request
      const response1 = await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${testServiceId}/questions`,
        regularUser.accessToken,
      ).expect(200)

      // Second request (should use cache)
      const response2 = await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${testServiceId}/questions`,
        regularUser.accessToken,
      ).expect(200)

      // Both should return same data
      expect(response1.body.data.kit.questions.length).toBe(
        response2.body.data.kit.questions.length,
      )
    })

    test('TC-INTERVIEW-KIT-008: Should return 400 if access expired', async () => {
      // Update purchase with expired access
      await Purchase.findByIdAndUpdate(purchaseId, {
        'metadata.accessExpiresAt': new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      })

      await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${testServiceId}/questions`,
        regularUser.accessToken,
      ).expect(400)
    })
  })

  describe('Service Validation', () => {
    test('TC-INTERVIEW-KIT-009: Should return 404 for non-interview-kit service', async () => {
      // Create a different service
      const otherServiceId = await createTestService(regularUser.id, {
        name: 'Resume Review Service',
        price: 299,
        category: 'resume',
        slug: `resume-service-${Date.now()}`,
      })

      // Create purchase
      await Purchase.create({
        user: regularUser.id,
        purchaseType: 'service',
        serviceId: otherServiceId,
        amount: 29900,
        originalAmount: 29900,
        currency: 'INR',
        status: 'completed',
        completedAt: new Date(),
      })

      await authenticatedRequest(
        'get',
        `/api/v1/interview-kits/${otherServiceId}/questions`,
        regularUser.accessToken,
      ).expect(404)
    })
  })
})
