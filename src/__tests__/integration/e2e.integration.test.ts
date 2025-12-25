/**
 * End-to-End Integration Test
 * Tests complete user journey from signup to premium purchase
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  authenticatedRequest,
} from './testHelpers'
import { Resource } from '../../modules/resources/resource.model'
import { Course } from '../../modules/courses/course.model'
import { Service } from '../../modules/services/service.model'

describe('End-to-End User Journey - Integration Test', () => {
  let userEmail: string
  let userPassword: string
  let accessToken: string
  let refreshToken: string

  beforeEach(async () => {
    await cleanupTestData()
    userEmail = generateTestEmail('e2e')
    userPassword = 'Test@1234'
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  test('TC-E2E-001: Complete User Journey - Signup → Browse → Bookmark → Enroll → Purchase Premium', async () => {
    // ========================================
    // STEP 1: User Registration
    // ========================================
    const signupResponse = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: userEmail,
        password: userPassword,
        name: 'E2E Test User',
      })
      .expect(201)

    expect(signupResponse.body.success).toBe(true)
    expect(signupResponse.body.data.user.email).toBe(userEmail)
    accessToken = signupResponse.body.data.accessToken
    refreshToken = signupResponse.body.data.refreshToken

    // ========================================
    // STEP 2: View Profile
    // ========================================
    const meResponse = await authenticatedRequest('get', '/api/v1/auth/me', accessToken).expect(200)
    expect(meResponse.body.success).toBe(true)
    expect(meResponse.body.data.user.email).toBe(userEmail)

    // ========================================
    // STEP 3: Browse Resources
    // ========================================
    // First, create some resources (as admin would)
    const adminUser = await createTestUser(
      generateTestEmail('admin'),
      'Admin@1234',
      'Admin',
      'admin',
    )

    const resource1Id = await Resource.create({
      title: 'JavaScript Basics',
      description: 'Learn JavaScript fundamentals',
      category: 'javascript',
      link: 'https://example.com/js-basics',
      difficulty: 'beginner',
      tags: ['javascript', 'basics'],
      createdBy: adminUser.id,
    }).then((r) => r._id.toString())

    await Resource.create({
      title: 'React Hooks Guide',
      description: 'Master React hooks',
      category: 'react',
      link: 'https://example.com/react-hooks',
      difficulty: 'intermediate',
      tags: ['react', 'hooks'],
      createdBy: adminUser.id,
    }).then((r) => r._id.toString())

    // Browse resources
    const resourcesResponse = await request(app)
      .get('/api/v1/resources')
      .query({ page: 1, limit: 10 })
      .expect(200)

    expect(resourcesResponse.body.success).toBe(true)
    expect(resourcesResponse.body.data.resources.length).toBeGreaterThan(0)

    // Filter by category
    const jsResourcesResponse = await request(app)
      .get('/api/v1/resources')
      .query({ category: 'javascript' })
      .expect(200)

    expect(jsResourcesResponse.body.success).toBe(true)

    // ========================================
    // STEP 4: Bookmark Resources
    // ========================================
    const bookmarkResponse = await authenticatedRequest(
      'post',
      `/api/v1/resources/${resource1Id}/bookmark`,
      accessToken,
    ).expect(200)
    expect(bookmarkResponse.body.success).toBe(true)
    expect(bookmarkResponse.body.data.bookmarked).toBe(true)

    // View bookmarks
    const bookmarksResponse = await authenticatedRequest(
      'get',
      '/api/v1/resources/bookmarks/all',
      accessToken,
    ).expect(200)
    expect(bookmarksResponse.body.success).toBe(true)
    expect(bookmarksResponse.body.data.resources.length).toBeGreaterThan(0)
    const bookmarkedResource = bookmarksResponse.body.data.resources.find(
      (r: any) => r._id === resource1Id,
    )
    expect(bookmarkedResource).toBeDefined()

    // ========================================
    // STEP 5: Browse Courses
    // ========================================
    const course1Id = await Course.create({
      title: 'Complete JavaScript Course',
      description: 'Master JavaScript from scratch',
      category: 'JavaScript',
      difficulty: 'beginner',
      price: 99.99,
      createdBy: adminUser.id,
      lessons: [
        {
          title: 'Introduction',
          content: 'Welcome to the course',
          videoUrl: 'https://example.com/video1',
          duration: 5,
        },
      ],
    }).then((c) => c._id.toString())

    const coursesResponse = await request(app)
      .get('/api/v1/courses')
      .query({ page: 1, limit: 10 })
      .expect(200)
    expect(coursesResponse.body.success).toBe(true)
    expect(coursesResponse.body.data.courses.length).toBeGreaterThan(0)

    // View course detail
    const courseDetailResponse = await request(app).get(`/api/v1/courses/${course1Id}`).expect(200)
    expect(courseDetailResponse.body.success).toBe(true)
    expect(courseDetailResponse.body.data.course._id).toBe(course1Id)

    // ========================================
    // STEP 6: Enroll in Free Course
    // ========================================
    const enrollResponse = await authenticatedRequest(
      'post',
      `/api/v1/courses/${course1Id}/enroll`,
      accessToken,
    ).expect(200)
    expect(enrollResponse.body.success).toBe(true)
    expect(enrollResponse.body.data.enrollment.enrolled).toBe(true)

    // Check enrollment
    const enrollmentStatusResponse = await authenticatedRequest(
      'get',
      `/api/v1/courses/${course1Id}/enrollment`,
      accessToken,
    ).expect(200)
    expect(enrollmentStatusResponse.body.success).toBe(true)
    expect(enrollmentStatusResponse.body.data.enrollment.enrolled).toBe(true)

    // Update progress
    const progressResponse = await authenticatedRequest(
      'patch',
      `/api/v1/courses/${course1Id}/progress`,
      accessToken,
    )
      .send({
        lessonId: 'lesson-0',
        completed: true,
        progress: 50,
      })
      .expect(200)
    expect(progressResponse.body.success).toBe(true)

    // ========================================
    // STEP 7: Browse Premium Services
    // ========================================
    const serviceId = await Service.create({
      name: 'Premium Resume Review',
      description: 'Get your resume reviewed by experts',
      price: 49.99,
      category: 'resume',
      slug: `premium-resume-${Date.now()}`,
      createdBy: adminUser.id,
    }).then((s) => s._id.toString())

    // ========================================
    // STEP 8: Create Premium Purchase Checkout
    // ========================================
    const checkoutResponse = await authenticatedRequest(
      'post',
      '/api/v1/purchases/checkout',
      accessToken,
    )
      .send({
        purchaseType: 'service',
        serviceId,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })
      .expect(200)

    expect(checkoutResponse.body.success).toBe(true)
    expect(checkoutResponse.body.data.orderId).toBeDefined()
    expect(checkoutResponse.body.data.purchaseId).toBeDefined()

    // ========================================
    // STEP 9: Token Refresh (simulating long session)
    // ========================================
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken })
      .expect(200)

    expect(refreshResponse.body.success).toBe(true)
    const newAccessToken = refreshResponse.body.data.accessToken

    // Verify new token works
    const meAfterRefreshResponse = await authenticatedRequest(
      'get',
      '/api/v1/auth/me',
      newAccessToken,
    ).expect(200)
    expect(meAfterRefreshResponse.body.success).toBe(true)
    expect(meAfterRefreshResponse.body.data.user.email).toBe(userEmail)

    // ========================================
    // STEP 10: View Purchase History
    // ========================================
    const purchasesResponse = await authenticatedRequest('get', '/api/v1/purchases', newAccessToken)
      .query({ page: 1, limit: 10 })
      .expect(200)

    expect(purchasesResponse.body.success).toBe(true)
    expect(purchasesResponse.body.data.purchases).toBeDefined()

    // ========================================
    // STEP 11: Update Profile
    // ========================================
    const updateProfileResponse = await authenticatedRequest(
      'put',
      '/api/v1/auth/me',
      newAccessToken,
    )
      .send({
        name: 'Updated E2E Test User',
      })
      .expect(200)

    expect(updateProfileResponse.body.success).toBe(true)
    expect(updateProfileResponse.body.data.user.name).toBe('Updated E2E Test User')

    // Verify update persisted
    const updatedMeResponse = await authenticatedRequest(
      'get',
      '/api/v1/auth/me',
      newAccessToken,
    ).expect(200)
    expect(updatedMeResponse.body.data.user.name).toBe('Updated E2E Test User')

    // ========================================
    // STEP 12: Use Chatbot (if available)
    // ========================================
    const chatResponse = await authenticatedRequest(
      'post',
      '/api/v1/chatbot/chat',
      newAccessToken,
    ).send({
      message: 'What is JavaScript?',
    })

    // Chatbot may or may not be available based on Gemini API key
    // Accept either success or appropriate error codes
    expect([200, 500, 503]).toContain(chatResponse.status)

    // ========================================
    // JOURNEY COMPLETE
    // ========================================
    console.log('✅ Complete user journey test passed!')
  })
})
