/**
 * Courses Flow Integration Tests
 * Tests complete course management and enrollment flow end-to-end
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  createTestCourse,
  authenticatedRequest,
} from './testHelpers'

describe('Courses Flow - Integration Tests', () => {
  let adminUser: { accessToken: string; id: string }
  let regularUser: { accessToken: string; id: string }
  let testCourseId: string

  beforeEach(async () => {
    await cleanupTestData()

    adminUser = await createTestUser(generateTestEmail('admin'), 'Test@1234', 'Admin User', 'admin')
    regularUser = await createTestUser(
      generateTestEmail('user'),
      'Test@1234',
      'Regular User',
      'user',
    )

    // Create a test course
    testCourseId = await createTestCourse(adminUser.id, {
      title: 'Integration Test Course',
      category: 'Web Development',
      difficulty: 'beginner',
      price: 99.99,
    })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Course CRUD Operations', () => {
    test('TC-COURSES-FLOW-001: Admin creates course → updates → deletes', async () => {
      // Create course
      const createResponse = await authenticatedRequest(
        'post',
        '/api/v1/courses',
        adminUser.accessToken,
      )
        .send({
          title: 'New Test Course',
          description: 'Test course description',
          category: 'JavaScript',
          difficulty: 'intermediate',
          price: 149.99,
          lessons: [
            {
              title: 'Lesson 1',
              content: 'Introduction',
              videoUrl: 'https://example.com/video1',
              duration: 10,
            },
            {
              title: 'Lesson 2',
              content: 'Advanced Topics',
              videoUrl: 'https://example.com/video2',
              duration: 15,
            },
          ],
        })
        .expect(201)

      expect(createResponse.body.success).toBe(true)
      expect(createResponse.body.data.course.title).toBe('New Test Course')
      expect(createResponse.body.data.course.lessons).toHaveLength(2)
      const createdCourseId = createResponse.body.data.course._id

      // Update course
      const updateResponse = await authenticatedRequest(
        'patch',
        `/api/v1/courses/${createdCourseId}`,
        adminUser.accessToken,
      )
        .send({
          title: 'Updated Test Course',
          difficulty: 'advanced',
        })
        .expect(200)

      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.course.title).toBe('Updated Test Course')
      expect(updateResponse.body.data.course.difficulty).toBe('advanced')

      // Delete course
      const deleteResponse = await authenticatedRequest(
        'delete',
        `/api/v1/courses/${createdCourseId}`,
        adminUser.accessToken,
      ).expect(200)

      expect(deleteResponse.body.success).toBe(true)

      // Verify course is deleted (soft delete)
      await request(app).get(`/api/v1/courses/${createdCourseId}`).expect(404)
    })

    test('TC-COURSES-FLOW-002: Regular user cannot create/update/delete courses', async () => {
      // Regular user cannot create
      await authenticatedRequest('post', '/api/v1/courses', regularUser.accessToken)
        .send({
          title: 'Unauthorized Course',
          description: 'Should not work',
          category: 'JavaScript',
          difficulty: 'beginner',
          price: 99.99,
        })
        .expect(403)

      // Regular user cannot update
      await authenticatedRequest(
        'patch',
        `/api/v1/courses/${testCourseId}`,
        regularUser.accessToken,
      )
        .send({ title: 'Updated' })
        .expect(403)

      // Regular user cannot delete
      await authenticatedRequest(
        'delete',
        `/api/v1/courses/${testCourseId}`,
        regularUser.accessToken,
      ).expect(403)
    })
  })

  describe('Course Enrollment', () => {
    test('TC-COURSES-FLOW-003: Enroll in course → check enrollment → track progress', async () => {
      // Enroll in course
      const enrollResponse = await authenticatedRequest(
        'post',
        `/api/v1/courses/${testCourseId}/enroll`,
        regularUser.accessToken,
      ).expect(200)

      expect(enrollResponse.body.success).toBe(true)
      expect(enrollResponse.body.data.enrollment).toBeDefined()
      expect(enrollResponse.body.data.enrollment.course).toBe(testCourseId)
      expect(enrollResponse.body.data.enrollment.user).toBe(regularUser.id)

      // Check enrollment status
      const enrollmentResponse = await authenticatedRequest(
        'get',
        `/api/v1/courses/${testCourseId}/enrollment`,
        regularUser.accessToken,
      ).expect(200)

      expect(enrollmentResponse.body.success).toBe(true)
      expect(enrollmentResponse.body.data.enrollment).toBeDefined()
      expect(enrollmentResponse.body.data.enrollment.enrolled).toBe(true)

      // Update progress
      const progressResponse = await authenticatedRequest(
        'patch',
        `/api/v1/courses/${testCourseId}/progress`,
        regularUser.accessToken,
      )
        .send({
          lessonId: 'lesson-1',
          completed: true,
          progress: 50,
        })
        .expect(200)

      expect(progressResponse.body.success).toBe(true)

      // Check updated enrollment with progress
      const updatedEnrollmentResponse = await authenticatedRequest(
        'get',
        `/api/v1/courses/${testCourseId}/enrollment`,
        regularUser.accessToken,
      ).expect(200)

      expect(updatedEnrollmentResponse.body.data.enrollment.progress).toBeDefined()
    })

    test('TC-COURSES-FLOW-004: Enrollment requires authentication', async () => {
      await request(app).post(`/api/v1/courses/${testCourseId}/enroll`).expect(401)

      await request(app).get(`/api/v1/courses/${testCourseId}/enrollment`).expect(401)
    })

    test('TC-COURSES-FLOW-005: Cannot enroll twice (idempotent enrollment)', async () => {
      // First enrollment
      await authenticatedRequest(
        'post',
        `/api/v1/courses/${testCourseId}/enroll`,
        regularUser.accessToken,
      ).expect(200)

      // Second enrollment (should still succeed but return existing enrollment)
      const secondEnrollResponse = await authenticatedRequest(
        'post',
        `/api/v1/courses/${testCourseId}/enroll`,
        regularUser.accessToken,
      ).expect(200)

      expect(secondEnrollResponse.body.success).toBe(true)
      // Should return existing enrollment
      expect(secondEnrollResponse.body.data.enrollment).toBeDefined()
    })
  })

  describe('Course Browsing', () => {
    beforeEach(async () => {
      // Create multiple courses for testing
      await createTestCourse(adminUser.id, {
        title: 'JavaScript Basics',
        category: 'JavaScript',
        difficulty: 'beginner',
        price: 49.99,
      })

      await createTestCourse(adminUser.id, {
        title: 'Advanced React',
        category: 'React',
        difficulty: 'advanced',
        price: 149.99,
      })

      await createTestCourse(adminUser.id, {
        title: 'Node.js Intermediate',
        category: 'Node.js',
        difficulty: 'intermediate',
        price: 99.99,
      })
    })

    test('TC-COURSES-FLOW-006: Browse courses with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/courses')
        .query({ page: 1, limit: 2 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.courses.length).toBeGreaterThan(0)
      expect(response.body.data.pagination).toBeDefined()
    })

    test('TC-COURSES-FLOW-007: Filter courses by category', async () => {
      const response = await request(app)
        .get('/api/v1/courses')
        .query({ category: 'JavaScript' })
        .expect(200)

      expect(response.body.success).toBe(true)
      if (response.body.data.courses.length > 0) {
        response.body.data.courses.forEach((course: any) => {
          expect(course.category).toBe('JavaScript')
        })
      }
    })

    test('TC-COURSES-FLOW-008: Filter courses by difficulty', async () => {
      const response = await request(app)
        .get('/api/v1/courses')
        .query({ difficulty: 'beginner' })
        .expect(200)

      expect(response.body.success).toBe(true)
      if (response.body.data.courses.length > 0) {
        response.body.data.courses.forEach((course: any) => {
          expect(course.difficulty).toBe('beginner')
        })
      }
    })

    test('TC-COURSES-FLOW-009: Get course by ID', async () => {
      const response = await request(app).get(`/api/v1/courses/${testCourseId}`).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.course._id).toBe(testCourseId)
      expect(response.body.data.course.title).toBe('Integration Test Course')
    })
  })
})
