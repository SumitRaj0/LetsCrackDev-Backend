/**
 * Course Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('Course Routes', () => {
  it('should register GET /courses route', async () => {
    const response = await request(app).get('/api/v1/courses')

    expect(response.status).toBe(200)
  })

  it('should register GET /courses/:id route', async () => {
    const response = await request(app).get('/api/v1/courses/invalid-id')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register POST /courses route (admin only)', async () => {
    const response = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PATCH /courses/:id route (admin only)', async () => {
    const response = await request(app)
      .patch('/api/v1/courses/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PUT /courses/:id route (admin only)', async () => {
    const response = await request(app)
      .put('/api/v1/courses/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register DELETE /courses/:id route (admin only)', async () => {
    const response = await request(app)
      .delete('/api/v1/courses/invalid-id')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
