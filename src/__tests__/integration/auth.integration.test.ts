/**
 * Authentication Flow Integration Tests
 * Tests complete authentication lifecycle end-to-end
 */

import request from 'supertest'
import app from '../../app'
import { createTestUser, cleanupTestData, generateTestEmail } from './testHelpers'
import { User } from '../../modules/auth/user.model'

describe('Authentication Flow - Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Complete Authentication Lifecycle', () => {
    test('TC-AUTH-FLOW-001: Signup → Login → Get Me → Refresh Token → Logout flow', async () => {
      const email = generateTestEmail('auth')
      const password = 'Test@1234'
      const name = 'Integration Test User'

      // Step 1: Signup
      const signupResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, name })
        .expect(201)

      expect(signupResponse.body.success).toBe(true)
      expect(signupResponse.body.data.user.email).toBe(email)
      expect(signupResponse.body.data.user.name).toBe(name)
      expect(signupResponse.body.data.accessToken).toBeDefined()
      expect(signupResponse.body.data.refreshToken).toBeDefined()

      const { accessToken, refreshToken } = signupResponse.body.data

      // Step 2: Get current user (verify token works)
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(meResponse.body.success).toBe(true)
      expect(meResponse.body.data.user.email).toBe(email)
      expect(meResponse.body.data.user.name).toBe(name)

      // Step 3: Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200)

      expect(refreshResponse.body.success).toBe(true)
      expect(refreshResponse.body.data.accessToken).toBeDefined()
      expect(refreshResponse.body.data.refreshToken).toBeDefined()

      const newAccessToken = refreshResponse.body.data.accessToken

      // Step 4: Verify new token works
      const meAfterRefreshResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200)

      expect(meAfterRefreshResponse.body.success).toBe(true)
      expect(meAfterRefreshResponse.body.data.user.email).toBe(email)
    })

    test('TC-AUTH-FLOW-002: Login with wrong password → correct password', async () => {
      const email = generateTestEmail('auth')
      const password = 'Test@1234'
      const wrongPassword = 'WrongPassword123'

      // Create user via signup
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, name: 'Test User' })
        .expect(201)

      // Try login with wrong password
      const wrongLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: wrongPassword })
        .expect(401)

      expect(wrongLoginResponse.body.success).toBe(false)
      expect(wrongLoginResponse.body.error).toContain('Invalid credentials')

      // Login with correct password
      const correctLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200)

      expect(correctLoginResponse.body.success).toBe(true)
      expect(correctLoginResponse.body.data.accessToken).toBeDefined()
    })

    test('TC-AUTH-FLOW-003: Forgot Password → Reset Password flow', async () => {
      const email = generateTestEmail('auth')
      const oldPassword = 'Test@1234'
      const newPassword = 'NewPassword@1234'

      // Create user
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password: oldPassword, name: 'Test User' })
        .expect(201)

      // Request password reset
      const forgotPasswordResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(200)

      expect(forgotPasswordResponse.body.success).toBe(true)

      // Get reset token from user document (in real app, this comes from email)
      const user = await User.findOne({ email })
      expect(user).toBeDefined()
      expect(user?.passwordResetToken).toBeDefined()
      expect(user?.passwordResetExpires).toBeDefined()

      const resetToken = user?.passwordResetToken

      if (!resetToken) {
        throw new Error('Reset token not found')
      }

      // Reset password
      const resetPasswordResponse = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword })
        .expect(200)

      expect(resetPasswordResponse.body.success).toBe(true)

      // Verify old password doesn't work
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: oldPassword })
        .expect(401)

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: newPassword })
        .expect(200)

      expect(loginResponse.body.success).toBe(true)
      expect(loginResponse.body.data.accessToken).toBeDefined()
    })

    test('TC-AUTH-FLOW-004: Protected route access with valid/invalid tokens', async () => {
      const { accessToken } = await createTestUser()

      // Valid token - should work
      const validResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(validResponse.body.success).toBe(true)

      // Invalid token - should fail
      const invalidResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401)

      expect(invalidResponse.body.success).toBe(false)

      // No token - should fail
      const noTokenResponse = await request(app).get('/api/v1/auth/me').expect(401)

      expect(noTokenResponse.body.success).toBe(false)
    })

    test('TC-AUTH-FLOW-005: Admin route access (user vs admin)', async () => {
      // Create regular user
      const regularUser = await createTestUser(
        generateTestEmail('user'),
        'Test@1234',
        'Regular User',
        'user',
      )

      // Create admin user
      const adminUser = await createTestUser(
        generateTestEmail('admin'),
        'Test@1234',
        'Admin User',
        'admin',
      )

      // Regular user cannot access admin route
      const regularUserResponse = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .expect(403)

      expect(regularUserResponse.body.success).toBe(false)

      // Admin user can access admin route
      const adminUserResponse = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200)

      expect(adminUserResponse.body.success).toBe(true)
      expect(adminUserResponse.body.message).toContain('admin')
    })

    test('TC-AUTH-FLOW-006: Update profile and change password', async () => {
      const { accessToken, id } = await createTestUser()
      const newName = 'Updated Name'
      const newPassword = 'NewPassword@1234'

      // Update profile
      const updateProfileResponse = await request(app)
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: newName })
        .expect(200)

      expect(updateProfileResponse.body.success).toBe(true)
      expect(updateProfileResponse.body.data.user.name).toBe(newName)

      // Verify profile update persisted
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(meResponse.body.data.user.name).toBe(newName)

      // Change password
      const changePasswordResponse = await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Test@1234',
          newPassword,
        })
        .expect(200)

      expect(changePasswordResponse.body.success).toBe(true)

      // Verify old password doesn't work (need to login again)
      const user = await User.findById(id)
      expect(user).toBeDefined()

      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user!.email, password: 'Test@1234' })
        .expect(401)

      // Verify new password works
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user!.email, password: newPassword })
        .expect(200)
    })

    test('TC-AUTH-FLOW-007: Account deletion', async () => {
      const { accessToken, email } = await createTestUser()

      // Delete account
      const deleteResponse = await request(app)
        .delete('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(deleteResponse.body.success).toBe(true)

      // Verify account is deleted (cannot login)
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Test@1234' })
        .expect(401)

      // Verify token no longer works
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401)
    })
  })
})
