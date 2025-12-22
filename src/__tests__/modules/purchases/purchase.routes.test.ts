/**
 * Purchase Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('Purchase Routes', () => {
  it('should register POST /purchases/checkout route', async () => {
    const response = await request(app)
      .post('/api/v1/purchases/checkout')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register POST /purchases/verify route', async () => {
    const response = await request(app)
      .post('/api/v1/purchases/verify')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register GET /purchases/status/:orderId route', async () => {
    const response = await request(app)
      .get('/api/v1/purchases/status/test-order-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register GET /purchases route', async () => {
    const response = await request(app)
      .get('/api/v1/purchases')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register GET /purchases/:id route', async () => {
    const response = await request(app)
      .get('/api/v1/purchases/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
