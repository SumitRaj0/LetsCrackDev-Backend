/**
 * Additional Auth Controller Tests
 * Tests for updateMe, deleteMe, forgotPassword, resetPassword
 */

import { Request, Response, NextFunction } from 'express'
import { User } from '../../../modules/auth/user.model'
import {
  updateMe,
  deleteMe,
  forgotPassword,
  resetPassword,
} from '../../../modules/auth/auth.controller'
import { sendResponse } from '../../../utils/response'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

jest.mock('../../../utils/response')
jest.mock('../../../utils/logger')

describe('Additional Auth Controller Tests', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(async () => {
    await User.deleteMany({})
    jest.clearAllMocks()

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }

    mockNext = jest.fn()
  })

  describe('updateMe', () => {
    it('should update user profile successfully', async () => {
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('Test123!@#', 10),
        role: 'user',
      })

      mockReq = {
        body: {
          name: 'Updated Name',
          phone: '1234567890',
        },
        authUser: { sub: testUser._id.toString() },
      } as any

      await updateMe(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.name).toBe('Updated Name')
      expect(updatedUser?.phone).toBe('1234567890')
    })

    it('should update password successfully', async () => {
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('OldPass123!@#', 10),
        role: 'user',
      })

      const oldHash = testUser.passwordHash

      mockReq = {
        body: {
          password: 'NewPass123!@#',
        },
        authUser: { sub: testUser._id.toString() },
      } as any

      await updateMe(mockReq as Request, mockRes as Response, mockNext)

      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordHash).not.toBe(oldHash)
    })

    it('should reject email already in use', async () => {
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        passwordHash: await bcrypt.hash('Test123!@#', 10),
        role: 'user',
      })

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        passwordHash: await bcrypt.hash('Test123!@#', 10),
        role: 'user',
      })

      mockReq = {
        body: {
          email: 'user1@example.com',
        },
        authUser: { sub: user2._id.toString() },
      } as any

      await updateMe(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq = {
        body: { name: 'Updated Name' },
        authUser: undefined,
      } as any

      await updateMe(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle validation errors', async () => {
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('Test123!@#', 10),
        role: 'user',
      })

      mockReq = {
        body: {
          email: 'invalid-email',
        },
        authUser: { sub: testUser._id.toString() },
      } as any

      await updateMe(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('deleteMe', () => {
    it('should delete user account successfully', async () => {
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('Test123!@#', 10),
        role: 'user',
      })

      mockReq = {
        authUser: { sub: testUser._id.toString() },
      } as any

      await deleteMe(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const deletedUser = await User.findById(testUser._id)
      expect(deletedUser).toBeNull()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq = {
        authUser: undefined,
      } as any

      await deleteMe(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('Test123!@#', 10),
        role: 'user',
      })

      mockReq = {
        body: {
          email: 'test@example.com',
        },
      } as any

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordResetToken).toBeDefined()
      expect(updatedUser?.passwordResetExpires).toBeDefined()
    })

    it('should return success even for non-existent user (security)', async () => {
      mockReq = {
        body: {
          email: 'nonexistent@example.com',
        },
      } as any

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      mockReq = {
        body: {
          email: 'invalid-email',
        },
      } as any

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
      const resetExpires = new Date()
      resetExpires.setHours(resetExpires.getHours() + 1)

      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('OldPass123!@#', 10),
        role: 'user',
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetExpires,
      })

      const oldHash = testUser.passwordHash

      mockReq = {
        body: {
          token: resetToken,
          password: 'NewPass123!@#',
        },
      } as any

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.passwordHash).not.toBe(oldHash)
      expect(updatedUser?.passwordResetToken).toBeUndefined()
      expect(updatedUser?.passwordResetExpires).toBeUndefined()
    })

    it('should reject invalid token', async () => {
      mockReq = {
        body: {
          token: 'invalid-token',
          password: 'NewPass123!@#',
        },
      } as any

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should reject expired token', async () => {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
      const resetExpires = new Date()
      resetExpires.setHours(resetExpires.getHours() - 1) // Expired

      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('OldPass123!@#', 10),
        role: 'user',
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetExpires,
      })

      mockReq = {
        body: {
          token: resetToken,
          password: 'NewPass123!@#',
        },
      } as any

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle validation errors', async () => {
      mockReq = {
        body: {
          token: 'short',
          password: 'weak',
        },
      } as any

      await resetPassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
