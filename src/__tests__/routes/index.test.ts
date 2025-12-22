/**
 * Routes Index Tests
 * Comprehensive coverage for routes/index.ts to achieve 100% coverage
 */

import request from 'supertest'
import app from '../../app'
import router from '../../routes'

describe('Routes Index', () => {
  const originalEnv = process.env.API_VERSION

  afterEach(() => {
    process.env.API_VERSION = originalEnv
    jest.clearAllMocks()
  })

  describe('Root endpoint', () => {
    it('should return API info on GET /api/v1/', async () => {
      const response = await request(app).get('/api/v1/')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        name: 'LetsCrackDev API',
        version: expect.any(String),
        status: 'running',
        timestamp: expect.any(String),
        message: expect.any(String),
      })
    })

    it('should return API info on GET /api/', async () => {
      const response = await request(app).get('/api/')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        name: 'LetsCrackDev API',
        status: 'running',
      })
    })

    it('should include version from environment variable', async () => {
      process.env.API_VERSION = 'v2'
      
      jest.resetModules()
      const newApp = (await import('../../app')).default
      
      const response = await request(newApp).get('/api/v2/')
      
      expect(response.body.version).toBe('v2')
    })

    it('should default to v1 when API_VERSION is not set', async () => {
      delete process.env.API_VERSION
      
      jest.resetModules()
      const newApp = (await import('../../app')).default
      
      const response = await request(newApp).get('/api/v1/')
      
      expect(response.body.version).toBe('v1')
    })

    it('should include timestamp in ISO format', async () => {
      const response = await request(app).get('/api/v1/')

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp)
    })

    it('should include complete message about available modules', async () => {
      const response = await request(app).get('/api/v1/')

      expect(response.body.message).toContain('Auth module')
      expect(response.body.message).toContain('User module')
      expect(response.body.message).toContain('Resources module')
      expect(response.body.message).toContain('Services module')
      expect(response.body.message).toContain('Courses module')
      expect(response.body.message).toContain('/auth')
      expect(response.body.message).toContain('/user')
      expect(response.body.message).toContain('/resources')
      expect(response.body.message).toContain('/services')
      expect(response.body.message).toContain('/courses')
    })

    it('should return all required fields in root endpoint', async () => {
      const response = await request(app).get('/api/v1/')

      expect(response.body).toHaveProperty('name')
      expect(response.body).toHaveProperty('version')
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('message')
    })
  })

  describe('Route mounting', () => {
    it('should mount auth routes at /api/v1/auth', async () => {
      const response = await request(app).get('/api/v1/auth/me')
      // Should not be 404 (route exists, may return 401 if not authenticated)
      expect(response.status).not.toBe(404)
    })

    it('should mount user routes at /api/v1/user', async () => {
      const response = await request(app).get('/api/v1/user/profile')
      // Should not be 404 (route exists, may return 401 if not authenticated)
      expect(response.status).not.toBe(404)
    })

    it('should mount resources routes at /api/v1/resources', async () => {
      const response = await request(app).get('/api/v1/resources')
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should mount services routes at /api/v1/services', async () => {
      const response = await request(app).get('/api/v1/services')
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should mount courses routes at /api/v1/courses', async () => {
      const response = await request(app).get('/api/v1/courses')
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should mount purchases routes at /api/v1/purchases', async () => {
      const response = await request(app).get('/api/v1/purchases')
      // Should not be 404 (route exists, may return 401 if not authenticated)
      expect(response.status).not.toBe(404)
    })

    it('should mount admin routes at /api/v1/admin', async () => {
      const response = await request(app).get('/api/v1/admin/analytics')
      // Should not be 404 (route exists, may return 401/403 if not authenticated/authorized)
      expect(response.status).not.toBe(404)
    })

    it('should mount all routes on legacy /api path', async () => {
      const response = await request(app).get('/api/')
      expect(response.status).toBe(200)
    })
  })

  describe('Router export', () => {
    it('should export router as default', () => {
      expect(router).toBeDefined()
      expect(typeof router).toBe('function')
    })
  })
})

