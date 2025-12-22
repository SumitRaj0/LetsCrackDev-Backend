/**
 * Admin Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('Admin Routes', () => {
  it('should register GET /admin/analytics route', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register GET /admin/analytics/monthly route', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/monthly')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register GET /admin/analytics/sales route', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/sales')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register GET /admin/analytics/users route', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/users')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
