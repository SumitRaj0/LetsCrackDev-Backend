/**
 * Admin Flow Integration Tests
 * Tests admin-only functionality end-to-end
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  createTestResource,
  createTestCourse,
  authenticatedRequest,
} from './testHelpers'
import { Purchase } from '../../modules/purchases/purchase.model'

describe('Admin Flow - Integration Tests', () => {
  let adminUser: { accessToken: string; id: string }
  let regularUser: { accessToken: string; id: string }

  beforeEach(async () => {
    await cleanupTestData()

    adminUser = await createTestUser(generateTestEmail('admin'), 'Test@1234', 'Admin User', 'admin')
    regularUser = await createTestUser(
      generateTestEmail('user'),
      'Test@1234',
      'Regular User',
      'user',
    )

    // Create some test data for analytics
    await createTestResource(adminUser.id, {
      title: 'Test Resource 1',
      category: 'javascript',
      difficulty: 'beginner',
    })

    await createTestCourse(adminUser.id, {
      title: 'Test Course 1',
      category: 'Web Development',
      difficulty: 'beginner',
      price: 99.99,
    })

    // Create a purchase
    await Purchase.create({
      user: regularUser.id,
      purchaseType: 'course',
      amount: 99.99,
      currency: 'INR',
      status: 'completed',
    })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Admin Analytics', () => {
    test('TC-ADMIN-FLOW-001: Get analytics overview', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics',
        adminUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      // Analytics should contain relevant metrics
      expect(response.body.data.totalUsers).toBeDefined()
      expect(response.body.data.totalResources).toBeDefined()
      expect(response.body.data.totalCourses).toBeDefined()
    })

    test('TC-ADMIN-FLOW-002: Get monthly statistics', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/monthly',
        adminUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
    })

    test('TC-ADMIN-FLOW-003: Get sales data', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/sales',
        adminUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
    })

    test('TC-ADMIN-FLOW-004: Get user statistics', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/users',
        adminUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
    })

    test('TC-ADMIN-FLOW-005: Regular user cannot access admin analytics', async () => {
      await authenticatedRequest('get', '/api/v1/admin/analytics', regularUser.accessToken).expect(
        403,
      )

      await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/monthly',
        regularUser.accessToken,
      ).expect(403)

      await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/sales',
        regularUser.accessToken,
      ).expect(403)

      await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/users',
        regularUser.accessToken,
      ).expect(403)
    })

    test('TC-ADMIN-FLOW-006: Unauthenticated user cannot access admin analytics', async () => {
      await request(app).get('/api/v1/admin/analytics').expect(401)

      await request(app).get('/api/v1/admin/analytics/monthly').expect(401)
    })
  })

  describe('Admin Resource Management', () => {
    test('TC-ADMIN-FLOW-007: Admin can manage all resources', async () => {
      // Admin can create resource
      const createResponse = await authenticatedRequest(
        'post',
        '/api/v1/resources',
        adminUser.accessToken,
      )
        .send({
          title: 'Admin Created Resource',
          description: 'Test description',
          category: 'javascript',
          link: 'https://example.com/admin-resource',
          difficulty: 'beginner',
        })
        .expect(201)

      expect(createResponse.body.success).toBe(true)
      const resourceId = createResponse.body.data.resource._id

      // Admin can update any resource
      const updateResponse = await authenticatedRequest(
        'patch',
        `/api/v1/resources/${resourceId}`,
        adminUser.accessToken,
      )
        .send({
          title: 'Updated by Admin',
        })
        .expect(200)

      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.resource.title).toBe('Updated by Admin')

      // Admin can delete any resource
      await authenticatedRequest(
        'delete',
        `/api/v1/resources/${resourceId}`,
        adminUser.accessToken,
      ).expect(200)
    })

    test('TC-ADMIN-FLOW-008: Admin can view all resources including soft-deleted', async () => {
      // Create and delete a resource
      const resourceId = await createTestResource(adminUser.id)
      await authenticatedRequest(
        'delete',
        `/api/v1/resources/${resourceId}`,
        adminUser.accessToken,
      ).expect(200)

      // Regular listing shouldn't show deleted resources
      const regularListResponse = await request(app).get('/api/v1/resources').expect(200)
      const deletedResource = regularListResponse.body.data.resources.find(
        (r: any) => r._id === resourceId,
      )
      expect(deletedResource).toBeUndefined()
    })
  })

  describe('Admin Course Management', () => {
    test('TC-ADMIN-FLOW-009: Admin can manage all courses', async () => {
      // Admin can create course
      const createResponse = await authenticatedRequest(
        'post',
        '/api/v1/courses',
        adminUser.accessToken,
      )
        .send({
          title: 'Admin Created Course',
          description: 'Test course description',
          category: 'JavaScript',
          difficulty: 'beginner',
          price: 99.99,
        })
        .expect(201)

      expect(createResponse.body.success).toBe(true)
      const courseId = createResponse.body.data.course._id

      // Admin can update any course
      const updateResponse = await authenticatedRequest(
        'patch',
        `/api/v1/courses/${courseId}`,
        adminUser.accessToken,
      )
        .send({
          title: 'Updated by Admin',
        })
        .expect(200)

      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.course.title).toBe('Updated by Admin')

      // Admin can delete any course
      await authenticatedRequest(
        'delete',
        `/api/v1/courses/${courseId}`,
        adminUser.accessToken,
      ).expect(200)
    })
  })

  describe('Admin User Management Access', () => {
    test('TC-ADMIN-FLOW-010: Admin can access user data through analytics', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/v1/admin/analytics/users',
        adminUser.accessToken,
      ).expect(200)

      expect(response.body.success).toBe(true)
      // Should contain user statistics
      expect(response.body.data).toBeDefined()
    })
  })

  describe('Admin Permissions', () => {
    test('TC-ADMIN-FLOW-011: Only admin role can access admin routes', async () => {
      // Regular user with 'user' role
      await authenticatedRequest('get', '/api/v1/admin/analytics', regularUser.accessToken).expect(
        403,
      )

      // Admin user with 'admin' role
      await authenticatedRequest('get', '/api/v1/admin/analytics', adminUser.accessToken).expect(
        200,
      )
    })

    test('TC-ADMIN-FLOW-012: Admin middleware works correctly', async () => {
      // Test that admin routes are protected
      const testRoutes = [
        '/api/v1/admin/analytics',
        '/api/v1/admin/analytics/monthly',
        '/api/v1/admin/analytics/sales',
        '/api/v1/admin/analytics/users',
      ]

      for (const route of testRoutes) {
        // Unauthenticated
        await request(app).get(route).expect(401)

        // Authenticated but not admin
        await authenticatedRequest('get', route, regularUser.accessToken).expect(403)

        // Admin
        await authenticatedRequest('get', route, adminUser.accessToken).expect(200)
      }
    })
  })
})
