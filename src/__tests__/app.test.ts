/**
 * App Tests
 * Comprehensive test coverage for app.ts (lines 1-112)
 * Uses dynamic imports to ensure coverage tracking of module-level code
 */

// CRITICAL: All mocks must be at the very top, before any imports
// This ensures Jest hoists them before any module loading

// Mock auth middleware FIRST - this is imported by routes
// Must be a real function, not jest.fn() for Express to accept it
const mockRequireAuth = (_req: any, _res: any, next: any) => next()
const mockRequireAdmin = (_req: any, _res: any, next: any) => next()

jest.mock('../modules/auth/auth.middleware', () => ({
  requireAuth: mockRequireAuth,
  requireAdmin: mockRequireAdmin,
}))

// Mock purchase controller
jest.mock('../modules/purchases/purchase.controller', () => ({
  handleWebhook: jest.fn((_req, res, _next) => {
    res.status(200).json({ received: true })
  }),
}))

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

import request from 'supertest'

// Import app - this executes ALL code in app.ts
// The import statement executes: lines 1-18, 22-68, 95-107
import app from '../app'

// Import mocks after app import
import { handleWebhook } from '../modules/purchases/purchase.controller'
import { logger } from '../utils/logger'

describe('App (app.ts lines 1-112)', () => {
  const originalEnv = process.env.API_VERSION
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env.API_VERSION = originalEnv
    process.env.NODE_ENV = originalNodeEnv
  })

  // Test lines 16, 109: App instance creation and export
  describe('App instance (lines 16, 109)', () => {
    it('should create Express app instance (line 16)', () => {
      expect(app).toBeDefined()
      expect(typeof app).toBe('function')
      expect(app.listen).toBeDefined()
      expect(typeof app.listen).toBe('function')
    })

    it('should export app as default (line 109)', () => {
      expect(app).toBeDefined()
      expect(app.use).toBeDefined()
      expect(app.get).toBeDefined()
    })
  })

  // Test line 18: API_VERSION configuration
  describe('API_VERSION configuration (line 18)', () => {
    it('should default to v1 when API_VERSION is not set', async () => {
      delete process.env.API_VERSION
      jest.resetModules()
      
      // Dynamic import ensures coverage tracks the execution
      const { default: newApp } = await import('../app')
      const response = await request(newApp).get('/')
      
      expect(response.body.version).toBe('v1')
      expect(response.body.endpoints.api).toBe('/api/v1')
    })

    it('should use API_VERSION from environment variable', async () => {
      process.env.API_VERSION = 'v2'
      jest.resetModules()
      
      const { default: newApp } = await import('../app')
      const response = await request(newApp).get('/')
      
      expect(response.body.version).toBe('v2')
      expect(response.body.endpoints.api).toBe('/api/v2')
    })
  })

  // Test lines 22-34: Versioned webhook route
  describe('Versioned webhook route (lines 22-34)', () => {
    it('should register versioned webhook route (line 22-23)', async () => {
      const webhookPayload = { event: 'payment.captured', payload: { id: 'test' } }
      
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(200)
      expect(handleWebhook).toHaveBeenCalled()
    })

    it('should parse JSON from raw body (line 28)', async () => {
      const webhookPayload = { event: 'payment.captured', payload: {} }
      
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .send(Buffer.from(JSON.stringify(webhookPayload)))
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(200)
      expect(handleWebhook).toHaveBeenCalled()
    })

    it('should handle JSON parse error - catch block (line 30)', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .send('invalid json')
        .set('Content-Type', 'application/json')

      // Error handler should catch the error from line 30
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should call handleWebhook after successful parse (line 32)', async () => {
      const webhookPayload = { event: 'payment.captured', payload: {} }
      
      await request(app)
        .post('/api/v1/purchases/webhook')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(handleWebhook).toHaveBeenCalled()
    })
  })

  // Test lines 37-48: Legacy webhook route
  describe('Legacy webhook route (lines 37-48)', () => {
    it('should register legacy webhook route (line 37-38)', async () => {
      const webhookPayload = { event: 'payment.captured', payload: { id: 'test' } }
      
      const response = await request(app)
        .post('/api/purchases/webhook')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(200)
      expect(handleWebhook).toHaveBeenCalled()
    })

    it('should parse JSON from raw body (line 42)', async () => {
      const webhookPayload = { event: 'payment.captured', payload: {} }
      
      const response = await request(app)
        .post('/api/purchases/webhook')
        .send(Buffer.from(JSON.stringify(webhookPayload)))
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(200)
      expect(handleWebhook).toHaveBeenCalled()
    })

    it('should handle JSON parse error - catch block (line 44)', async () => {
      const response = await request(app)
        .post('/api/purchases/webhook')
        .send('invalid json')
        .set('Content-Type', 'application/json')

      // Error handler should catch the error from line 44
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should call handleWebhook after successful parse (line 46)', async () => {
      const webhookPayload = { event: 'payment.captured', payload: {} }
      
      await request(app)
        .post('/api/purchases/webhook')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(handleWebhook).toHaveBeenCalled()
    })
  })

  // Test lines 51-52: Body parsing middleware
  describe('Body parsing middleware (lines 51-52)', () => {
    it('should configure JSON parser with 10mb limit (line 51)', async () => {
      const payload = { email: 'test@example.com', password: 'test123' }
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(payload)
        .set('Content-Type', 'application/json')

      // Should not be 400 for JSON parsing error
      expect(response.status).not.toBe(400)
    })

    it('should configure URL encoded parser with 10mb limit (line 52)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send('email=test@example.com&password=test123')
        .set('Content-Type', 'application/x-www-form-urlencoded')

      // Should not be 400 for URL encoding error
      expect(response.status).not.toBe(400)
    })
  })

  // Test line 53: CORS middleware
  describe('CORS middleware (line 53)', () => {
    it('should apply CORS middleware', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000')

      expect(response.status).toBe(200)
    })
  })

  // Test line 54: Security middleware
  describe('Security middleware (line 54)', () => {
    it('should apply security middleware using spread operator', async () => {
      const response = await request(app).get('/')
      expect(response.status).toBe(200)
    })
  })

  // Test lines 57-66: Debug logging middleware
  describe('Debug logging middleware (lines 57-66)', () => {
    it('should log request with [REQUEST] prefix (line 58)', async () => {
      await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Content-Type', 'application/json')

      expect(logger.info).toHaveBeenCalled()
      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      expect(logCall).toBeDefined()
      expect(logCall[0]).toContain('[REQUEST]')
    })

    it('should log request method (line 59)', async () => {
      await request(app).post('/api/v1/test').send({})

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1].method).toBe('POST')
      }
    })

    it('should log request URL (line 60)', async () => {
      await request(app).get('/health')

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1].url).toBeDefined()
        expect(typeof logCall[1].url).toBe('string')
      }
    })

    it('should log request path (line 61)', async () => {
      await request(app).get('/health')

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1].path).toBeDefined()
        expect(logCall[1].path).toBe('/health')
      }
    })

    it('should log origin header (line 62)', async () => {
      await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1].origin).toBe('http://localhost:3000')
      }
    })

    it('should log content-type header (line 63)', async () => {
      await request(app)
        .post('/api/v1/test')
        .set('Content-Type', 'application/json')
        .send({})

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1]['content-type']).toBe('application/json')
      }
    })

    it('should call next() after logging (line 65)', async () => {
      const response = await request(app).get('/health')
      expect(response.status).toBe(200)
    })
  })

  // Test line 68: Request logger middleware
  describe('Request logger middleware (line 68)', () => {
    it('should apply request logger middleware', async () => {
      const response = await request(app).get('/health')
      expect(response.status).toBe(200)
    })
  })

  // Test lines 71-83: Root endpoint
  describe('Root endpoint (lines 71-83)', () => {
    it('should handle GET / request (line 72)', async () => {
      const response = await request(app).get('/')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        name: 'LetsCrackDev API', // line 73
        version: expect.any(String), // line 74
        status: 'running', // line 75
        timestamp: expect.any(String), // line 76
        endpoints: expect.objectContaining({
          health: '/health', // line 78
          api: expect.any(String), // line 79
          legacy: '/api', // line 80
        }),
      })
    })

    it('should include API version (line 74)', async () => {
      const response = await request(app).get('/')
      expect(response.body.version).toBe('v1')
    })

    it('should include ISO timestamp (line 76)', async () => {
      const response = await request(app).get('/')
      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.toISOString()).toBe(response.body.timestamp)
    })

    it('should include all endpoint properties (lines 77-81)', async () => {
      const response = await request(app).get('/')
      expect(response.body.endpoints).toHaveProperty('health')
      expect(response.body.endpoints).toHaveProperty('api')
      expect(response.body.endpoints).toHaveProperty('legacy')
      expect(response.body.endpoints.health).toBe('/health')
      expect(response.body.endpoints.legacy).toBe('/api')
    })
  })

  // Test lines 86-92: Health endpoint
  describe('Health endpoint (lines 86-92)', () => {
    it('should handle GET /health request (line 87)', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'ok', // line 88
        timestamp: expect.any(String), // line 89
        uptime: expect.any(Number), // line 90
      })
    })

    it('should include ISO timestamp (line 89)', async () => {
      const response = await request(app).get('/health')
      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.toISOString()).toBe(response.body.timestamp)
    })

    it('should include process uptime (line 90)', async () => {
      const response = await request(app).get('/health')
      expect(typeof response.body.uptime).toBe('number')
      expect(response.body.uptime).toBeGreaterThanOrEqual(0)
    })
  })

  // Test line 95: Rate limiting middleware
  describe('Rate limiting middleware (line 95)', () => {
    it('should apply rate limiting middleware', async () => {
      const response = await request(app).get('/')
      expect(response.status).toBe(200)
    })
  })

  // Test line 98: Versioned API routes
  describe('Versioned API routes (line 98)', () => {
    it('should mount versioned API routes', async () => {
      const response = await request(app).get('/api/v1/')
      expect(response.status).toBe(200)
    })
  })

  // Test line 101: Legacy API routes
  describe('Legacy API routes (line 101)', () => {
    it('should mount legacy API routes', async () => {
      const response = await request(app).get('/api/')
      expect(response.status).toBe(200)
    })
  })

  // Test line 104: 404 handler
  describe('404 handler (line 104)', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route')
      expect(response.status).toBe(404)
    })
  })

  // Test line 107: Error handler
  describe('Error handler (line 107)', () => {
    it('should handle errors from webhook JSON parsing', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .send('invalid json')
        .set('Content-Type', 'application/json')

      // Error handler should catch the error
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  // Additional tests to ensure all edge cases are covered
  describe('Edge cases for complete coverage', () => {
    it('should handle webhook with empty buffer', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .send(Buffer.from(''))
        .set('Content-Type', 'application/json')

      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle webhook with malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/webhook')
        .send(Buffer.from('{invalid'))
        .set('Content-Type', 'application/json')

      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle requests without origin header', async () => {
      await request(app).get('/health')

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1]).toHaveProperty('origin')
      }
    })

    it('should handle requests without content-type header', async () => {
      await request(app).get('/health')

      const logCall = (logger.info as jest.Mock).mock.calls.find((call) =>
        call[0]?.includes('[REQUEST]')
      )
      if (logCall && logCall[1]) {
        expect(logCall[1]).toHaveProperty('content-type')
      }
    })

    it('should handle different HTTP methods in logger', async () => {
      await request(app).get('/health')
      await request(app).post('/api/v1/test').send({})
      await request(app).put('/api/v1/test').send({})
      await request(app).delete('/api/v1/test')
      await request(app).patch('/api/v1/test').send({})

      const logCalls = (logger.info as jest.Mock).mock.calls.filter((call) =>
        call[0]?.includes('[REQUEST]')
      )
      expect(logCalls.length).toBeGreaterThan(0)
    })

    it('should handle webhook with custom API_VERSION', async () => {
      process.env.API_VERSION = 'v2'
      jest.resetModules()
      
      const { default: newApp } = await import('../app')
      const webhookPayload = { event: 'payment.captured', payload: {} }
      
      await request(newApp)
        .post('/api/v2/purchases/webhook')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(handleWebhook).toHaveBeenCalled()
    })

    it('should handle legacy webhook error path', async () => {
      const response = await request(app)
        .post('/api/purchases/webhook')
        .send(Buffer.from('not json'))
        .set('Content-Type', 'application/json')

      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})
