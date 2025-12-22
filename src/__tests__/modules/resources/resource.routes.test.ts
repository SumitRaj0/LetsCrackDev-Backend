/**
 * Resource Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('Resource Routes', () => {
  it('should register GET /resources route', async () => {
    const response = await request(app).get('/api/v1/resources')

    expect(response.status).toBe(200)
  })

  it('should register GET /resources/:id route', async () => {
    const response = await request(app).get('/api/v1/resources/invalid-id')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register POST /resources route (admin only)', async () => {
    const response = await request(app)
      .post('/api/v1/resources')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PATCH /resources/:id route (admin only)', async () => {
    const response = await request(app)
      .patch('/api/v1/resources/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PUT /resources/:id route (admin only)', async () => {
    const response = await request(app)
      .put('/api/v1/resources/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register DELETE /resources/:id route (admin only)', async () => {
    const response = await request(app)
      .delete('/api/v1/resources/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
