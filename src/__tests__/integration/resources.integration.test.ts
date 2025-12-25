/**
 * Resources Flow Integration Tests
 * Tests complete resource management flow end-to-end
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  createTestResource,
  authenticatedRequest,
} from './testHelpers'

describe('Resources Flow - Integration Tests', () => {
  let adminUser: { accessToken: string; id: string }
  let regularUser: { accessToken: string; id: string }
  let testResourceId: string

  beforeEach(async () => {
    await cleanupTestData()

    // Create admin user for resource management
    adminUser = await createTestUser(generateTestEmail('admin'), 'Test@1234', 'Admin User', 'admin')

    // Create regular user for bookmarks
    regularUser = await createTestUser(
      generateTestEmail('user'),
      'Test@1234',
      'Regular User',
      'user',
    )

    // Create a test resource
    testResourceId = await createTestResource(adminUser.id, {
      title: 'Integration Test Resource',
      category: 'javascript',
      difficulty: 'beginner',
    })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Resource CRUD Operations', () => {
    test('TC-RESOURCES-FLOW-001: Admin creates resource → updates → deletes', async () => {
      // Create resource
      const createResponse = await authenticatedRequest(
        'post',
        '/api/v1/resources',
        adminUser.accessToken,
      )
        .send({
          title: 'New Test Resource',
          description: 'Test description',
          category: 'react',
          link: 'https://example.com/new-resource',
          difficulty: 'intermediate',
          tags: ['react', 'hooks'],
        })
        .expect(201)

      expect(createResponse.body.success).toBe(true)
      expect(createResponse.body.data.resource.title).toBe('New Test Resource')
      expect(createResponse.body.data.resource.category).toBe('react')
      const createdResourceId = createResponse.body.data.resource._id

      // Update resource
      const updateResponse = await authenticatedRequest(
        'patch',
        `/api/v1/resources/${createdResourceId}`,
        adminUser.accessToken,
      )
        .send({
          title: 'Updated Test Resource',
          difficulty: 'advanced',
        })
        .expect(200)

      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.resource.title).toBe('Updated Test Resource')
      expect(updateResponse.body.data.resource.difficulty).toBe('advanced')

      // Delete resource
      const deleteResponse = await authenticatedRequest(
        'delete',
        `/api/v1/resources/${createdResourceId}`,
        adminUser.accessToken,
      ).expect(200)

      expect(deleteResponse.body.success).toBe(true)

      // Verify resource is deleted (soft delete - should not appear in listings)
      const getResponse = await request(app)
        .get(`/api/v1/resources/${createdResourceId}`)
        .expect(404)
      expect(getResponse.body.success).toBe(false)
    })

    test('TC-RESOURCES-FLOW-002: Regular user cannot create/update/delete resources', async () => {
      // Regular user cannot create
      await authenticatedRequest('post', '/api/v1/resources', regularUser.accessToken)
        .send({
          title: 'Unauthorized Resource',
          description: 'Should not work',
          category: 'javascript',
          link: 'https://example.com',
          difficulty: 'beginner',
        })
        .expect(403)

      // Regular user cannot update
      await authenticatedRequest(
        'patch',
        `/api/v1/resources/${testResourceId}`,
        regularUser.accessToken,
      )
        .send({ title: 'Updated' })
        .expect(403)

      // Regular user cannot delete
      await authenticatedRequest(
        'delete',
        `/api/v1/resources/${testResourceId}`,
        regularUser.accessToken,
      ).expect(403)
    })
  })

  describe('Resource Browsing and Filtering', () => {
    beforeEach(async () => {
      // Create multiple resources for testing
      await createTestResource(adminUser.id, {
        title: 'JavaScript Basics',
        category: 'javascript',
        difficulty: 'beginner',
        link: 'https://example.com/js-basics',
      })

      await createTestResource(adminUser.id, {
        title: 'Advanced React',
        category: 'react',
        difficulty: 'advanced',
        link: 'https://example.com/advanced-react',
      })

      await createTestResource(adminUser.id, {
        title: 'Node.js Intermediate',
        category: 'nodejs',
        difficulty: 'intermediate',
        link: 'https://example.com/nodejs',
      })
    })

    test('TC-RESOURCES-FLOW-003: Browse resources with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/resources')
        .query({ page: 1, limit: 2 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.resources).toHaveLength(2)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(2)
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(2)
    })

    test('TC-RESOURCES-FLOW-004: Filter resources by category', async () => {
      const response = await request(app)
        .get('/api/v1/resources')
        .query({ category: 'javascript' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.resources.length).toBeGreaterThan(0)
      response.body.data.resources.forEach((resource: any) => {
        expect(resource.category).toBe('javascript')
      })
    })

    test('TC-RESOURCES-FLOW-005: Filter resources by difficulty', async () => {
      const response = await request(app)
        .get('/api/v1/resources')
        .query({ difficulty: 'beginner' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.resources.length).toBeGreaterThan(0)
      response.body.data.resources.forEach((resource: any) => {
        expect(resource.difficulty).toBe('beginner')
      })
    })

    test('TC-RESOURCES-FLOW-006: Search resources by title/description', async () => {
      const response = await request(app)
        .get('/api/v1/resources')
        .query({ search: 'JavaScript' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.resources.length).toBeGreaterThan(0)
      const hasJavaScript = response.body.data.resources.some((resource: any) =>
        resource.title.toLowerCase().includes('javascript'),
      )
      expect(hasJavaScript).toBe(true)
    })

    test('TC-RESOURCES-FLOW-007: Get resource by ID', async () => {
      const response = await request(app).get(`/api/v1/resources/${testResourceId}`).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.resource._id).toBe(testResourceId)
      expect(response.body.data.resource.title).toBe('Integration Test Resource')
    })
  })

  describe('Resource Bookmarking', () => {
    test('TC-RESOURCES-FLOW-008: Bookmark resource → view bookmarks → unbookmark', async () => {
      // Bookmark resource
      const bookmarkResponse = await authenticatedRequest(
        'post',
        `/api/v1/resources/${testResourceId}/bookmark`,
        regularUser.accessToken,
      ).expect(200)

      expect(bookmarkResponse.body.success).toBe(true)
      expect(bookmarkResponse.body.data.bookmarked).toBe(true)

      // View all bookmarks
      const bookmarksResponse = await authenticatedRequest(
        'get',
        '/api/v1/resources/bookmarks/all',
        regularUser.accessToken,
      ).expect(200)

      expect(bookmarksResponse.body.success).toBe(true)
      expect(bookmarksResponse.body.data.resources.length).toBeGreaterThan(0)
      const bookmarkedResource = bookmarksResponse.body.data.resources.find(
        (r: any) => r._id === testResourceId,
      )
      expect(bookmarkedResource).toBeDefined()

      // Unbookmark resource
      const unbookmarkResponse = await authenticatedRequest(
        'post',
        `/api/v1/resources/${testResourceId}/bookmark`,
        regularUser.accessToken,
      ).expect(200)

      expect(unbookmarkResponse.body.success).toBe(true)
      expect(unbookmarkResponse.body.data.bookmarked).toBe(false)

      // Verify bookmark is removed
      const bookmarksAfterResponse = await authenticatedRequest(
        'get',
        '/api/v1/resources/bookmarks/all',
        regularUser.accessToken,
      ).expect(200)

      const stillBookmarked = bookmarksAfterResponse.body.data.resources.find(
        (r: any) => r._id === testResourceId,
      )
      expect(stillBookmarked).toBeUndefined()
    })

    test('TC-RESOURCES-FLOW-009: Bookmark requires authentication', async () => {
      await request(app).post(`/api/v1/resources/${testResourceId}/bookmark`).expect(401)

      await request(app).get('/api/v1/resources/bookmarks/all').expect(401)
    })
  })

  describe('Resource Validation', () => {
    test('TC-RESOURCES-FLOW-010: Create resource with invalid data', async () => {
      // Missing required fields
      await authenticatedRequest('post', '/api/v1/resources', adminUser.accessToken)
        .send({
          title: 'Incomplete Resource',
          // Missing description, category, link
        })
        .expect(400)

      // Invalid URL
      await authenticatedRequest('post', '/api/v1/resources', adminUser.accessToken)
        .send({
          title: 'Invalid URL Resource',
          description: 'Test',
          category: 'javascript',
          link: 'not-a-valid-url',
          difficulty: 'beginner',
        })
        .expect(400)

      // Invalid difficulty
      await authenticatedRequest('post', '/api/v1/resources', adminUser.accessToken)
        .send({
          title: 'Invalid Difficulty',
          description: 'Test',
          category: 'javascript',
          link: 'https://example.com',
          difficulty: 'invalid-difficulty',
        })
        .expect(400)
    })
  })
})
