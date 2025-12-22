/**
 * Auth Routes Tests
 */

import request from 'supertest'
import app from '../../../app'

describe('Auth Routes', () => {
  it('should register signup route', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!@#',
      })

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register login route', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password',
      })

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register refresh-token route', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({
        refreshToken: 'test-token',
      })

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register forgot-password route', async () => {
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'test@example.com',
      })

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register reset-password route', async () => {
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'reset-token',
        password: 'NewPass123!@#',
      })

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register /me GET route', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists), but should be 401 (unauthorized)
    expect(response.status).not.toBe(404)
  })

  it('should register /me PUT route', async () => {
    const response = await request(app)
      .put('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register /me PATCH route', async () => {
    const response = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register /me DELETE route', async () => {
    const response = await request(app)
      .delete('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })

  it('should register admin-only route', async () => {
    const response = await request(app)
      .get('/api/v1/auth/admin-only')
      .set('Authorization', 'Bearer invalid-token')

    // Should not be 404 (route exists)
    expect(response.status).not.toBe(404)
  })
})
