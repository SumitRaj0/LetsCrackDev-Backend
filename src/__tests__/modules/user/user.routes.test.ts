/**
 * User Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('User Routes', () => {
  it('should register GET /user/profile route', async () => {
    const response = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PUT /user/profile route', async () => {
    const response = await request(app)
      .put('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PATCH /user/profile route', async () => {
    const response = await request(app)
      .patch('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register PUT /user/change-password route', async () => {
    const response = await request(app)
      .put('/api/v1/user/change-password')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register DELETE /user/account route', async () => {
    const response = await request(app)
      .delete('/api/v1/user/account')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
