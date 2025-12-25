/**
 * Password Reset Flow Tests
 * Tests the complete password reset flow from forgot password to reset password
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { forgotPassword, resetPassword } from '../../../modules/auth/auth.controller'
import { User } from '../../../modules/auth/user.model'
import { ValidationError, UnauthorizedError } from '../../../utils/errors'
import { sendEmail } from '../../../utils/email'

// Mock dependencies
jest.mock('../../../utils/email')
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Password Reset Flow', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let testUser: any

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks()

    // Create mock request, response, and next function
    mockReq = {
      body: {},
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    // Create a test user
    const passwordHash = await bcrypt.hash('OldPassword123!', 10)
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash,
      role: 'user',
    })
  })

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({})
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe('Forgot Password', () => {
    it('should generate reset token for valid email', async () => {
      mockReq.body = { email: 'test@example.com' }

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      )

      // Verify token was saved to user
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordResetToken).toBeDefined()
      expect(updatedUser?.passwordResetExpires).toBeDefined()
      expect(updatedUser?.passwordResetExpires?.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return success even for non-existent email (security)', async () => {
      mockReq.body = { email: 'nonexistent@example.com' }

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('If an account with that email exists'),
        }),
      )
    })

    it('should throw ValidationError for invalid email format', async () => {
      mockReq.body = { email: 'invalid-email' }

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should generate unique reset tokens for each request', async () => {
      mockReq.body = { email: 'test@example.com' }

      // First request
      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)
      const firstUser = await User.findById(testUser._id)
      const firstToken = firstUser?.passwordResetToken

      // Second request
      jest.clearAllMocks()
      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)
      const secondUser = await User.findById(testUser._id)
      const secondToken = secondUser?.passwordResetToken

      expect(firstToken).not.toBe(secondToken)
    })

    it('should set token expiration to 1 hour from now', async () => {
      mockReq.body = { email: 'test@example.com' }
      const beforeRequest = Date.now()

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      const updatedUser = await User.findById(testUser._id)
      const expiresAt = updatedUser?.passwordResetExpires?.getTime()
      const oneHour = 60 * 60 * 1000

      expect(expiresAt).toBeDefined()
      if (expiresAt) {
        expect(expiresAt - beforeRequest).toBeGreaterThan(oneHour - 1000) // Allow 1 second margin
        expect(expiresAt - beforeRequest).toBeLessThan(oneHour + 1000)
      }
    })

    it('should attempt to send email with reset link', async () => {
      mockReq.body = { email: 'test@example.com' }
      process.env.NODE_ENV = 'test'

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Password Reset Request',
        }),
      )
    })
  })

  describe('Reset Password', () => {
    let resetToken: string
    let resetTokenHash: string

    beforeEach(async () => {
      // Generate a reset token
      resetToken = crypto.randomBytes(32).toString('hex')
      resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

      // Set token on user
      testUser.passwordResetToken = resetTokenHash
      testUser.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      await testUser.save()
    })

    it('should successfully reset password with valid token', async () => {
      const newPassword = 'NewPassword123!'
      mockReq.body = { token: resetToken, password: newPassword }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      )

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordResetToken).toBeUndefined()
      expect(updatedUser?.passwordResetExpires).toBeUndefined()

      // Verify new password works
      const isValid = await bcrypt.compare(newPassword, updatedUser!.passwordHash)
      expect(isValid).toBe(true)
    })

    it('should throw UnauthorizedError for invalid token', async () => {
      mockReq.body = { token: 'invalid-token-123', password: 'NewPassword123!' }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw UnauthorizedError for expired token', async () => {
      // Set expired token
      testUser.passwordResetExpires = new Date(Date.now() - 1000) // 1 second ago
      await testUser.save()

      mockReq.body = { token: resetToken, password: 'NewPassword123!' }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError for weak password', async () => {
      mockReq.body = { token: resetToken, password: 'weak' }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw ValidationError for missing token', async () => {
      mockReq.body = { password: 'NewPassword123!' }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should clear reset token after successful reset', async () => {
      mockReq.body = { token: resetToken, password: 'NewPassword123!' }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordResetToken).toBeUndefined()
      expect(updatedUser?.passwordResetExpires).toBeUndefined()
    })

    it('should not allow reusing the same token', async () => {
      const newPassword = 'NewPassword123!'
      mockReq.body = { token: resetToken, password: newPassword }

      // First reset
      await resetPassword(mockReq as Request, mockRes as Response, mockNext)
      expect(mockRes.status).toHaveBeenCalledWith(200)

      // Try to use same token again
      jest.clearAllMocks()
      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should hash the new password before saving', async () => {
      const newPassword = 'NewPassword123!'
      mockReq.body = { token: resetToken, password: newPassword }

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordHash).not.toBe(newPassword)
      expect(updatedUser?.passwordHash).not.toBe(testUser.passwordHash)

      // Verify it's a bcrypt hash
      const isValid = await bcrypt.compare(newPassword, updatedUser!.passwordHash)
      expect(isValid).toBe(true)
    })
  })

  describe('Complete Flow Integration', () => {
    it('should complete full password reset flow', async () => {
      const originalPassword = 'OldPassword123!'
      const newPassword = 'NewPassword123!'

      // Step 1: Request password reset
      mockReq.body = { email: 'test@example.com' }
      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      // Get the reset token from user
      const userWithToken = await User.findById(testUser._id)
      const resetTokenHash = userWithToken?.passwordResetToken
      expect(resetTokenHash).toBeDefined()

      // Step 2: Find the original token (we need to reverse hash, but we can't)
      // Instead, we'll create a new token for testing
      const resetToken = crypto.randomBytes(32).toString('hex')
      const newResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
      testUser.passwordResetToken = newResetTokenHash
      testUser.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
      await testUser.save()

      // Step 3: Reset password with token
      jest.clearAllMocks()
      mockReq.body = { token: resetToken, password: newPassword }
      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)

      // Step 4: Verify old password doesn't work
      const finalUser = await User.findById(testUser._id)
      const oldPasswordValid = await bcrypt.compare(originalPassword, finalUser!.passwordHash)
      expect(oldPasswordValid).toBe(false)

      // Step 5: Verify new password works
      const newPasswordValid = await bcrypt.compare(newPassword, finalUser!.passwordHash)
      expect(newPasswordValid).toBe(true)
    })
  })
})
