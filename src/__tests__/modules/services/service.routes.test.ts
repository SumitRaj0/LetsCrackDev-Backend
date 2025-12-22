/**
 * Service Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('Service Routes', () => {
  it('should register GET /services route', async () => {
    const response = await request(app).get('/api/v1/services')

    expect(response.status).toBe(200)
  })

  it('should register GET /services/:idOrSlug route', async () => {
    const response = await request(app).get('/api/v1/services/invalid-id')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register POST /services route (admin only)', async () => {
    const response = await request(app)
      .post('/api/v1/services')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PATCH /services/:id route (admin only)', async () => {
    const response = await request(app)
      .patch('/api/v1/services/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PUT /services/:id route (admin only)', async () => {
    const response = await request(app)
      .put('/api/v1/services/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register DELETE /services/:id route (admin only)', async () => {
    const response = await request(app)
      .delete('/api/v1/services/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
