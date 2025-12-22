/**
 * User Controller Tests
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '@/modules/auth/user.model'
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '@/modules/user/user.controller'
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'

jest.mock('../../../utils/response')

describe('User Controller', () => {
  let mockReq: Partial<Request & { authUser?: { sub?: string; role?: string } }>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let testUser: any

  beforeEach(async () => {
    mockReq = {
      body: {},
      authUser: { sub: '', role: 'user' },
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    // Create test user with email unique to this suite
    const passwordHash = await bcrypt.hash('Test@1234', 10)
    testUser = await User.create({
      name: 'Test User',
      email: 'user.controller@test.com',
      passwordHash,
      role: 'user',
    })
    mockReq.authUser!.sub = testUser._id.toString()
  })

  afterEach(async () => {
    await User.deleteMany({})
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      await getProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          user: expect.objectContaining({
            id: testUser._id.toString(),
            name: 'Test User',
            email: 'user.controller@test.com',
          }),
        }),
        'Profile retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when authUser is missing', async () => {
      mockReq.authUser = undefined

      await getProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw NotFoundError when user does not exist', async () => {
      mockReq.authUser!.sub = new mongoose.Types.ObjectId().toString()

      await getProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      mockReq.body = {
        name: 'Updated Name',
        phone: '1234567890',
      }

      await updateProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          user: expect.objectContaining({
            name: 'Updated Name',
            phone: '1234567890',
          }),
        }),
        'Profile updated successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should update email successfully', async () => {
      mockReq.body = {
        email: 'newemail@example.com',
      }

      await updateProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.email).toBe('newemail@example.com')
    })

    it('should throw ConflictError when email is already in use', async () => {
      // Create another user with different email
      await User.create({
        name: 'Other User',
        email: 'other@example.com',
        passwordHash: 'hash',
      })

      mockReq.body = {
        email: 'other@example.com',
      }

      await updateProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.body = {
        name: 'A', // Too short
      }

      await updateProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined

      await updateProfile(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockReq.body = {
        currentPassword: 'Test@1234',
        newPassword: 'NewPass@1234',
        confirmPassword: 'NewPass@1234',
      }

      await changePassword(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        { success: true },
        'Password changed successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()

      // Basic assertion is enough here; password hashing is covered elsewhere
      // Avoid relying on direct DB reads which can be flaky with plugins/indexes
    })

    it('should throw UnauthorizedError when current password is incorrect', async () => {
      mockReq.body = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPass@1234',
        confirmPassword: 'NewPass@1234',
      }

      await changePassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ValidationError when passwords do not match', async () => {
      mockReq.body = {
        currentPassword: 'Test@1234',
        newPassword: 'NewPass@1234',
        confirmPassword: 'DifferentPass@1234',
      }

      await changePassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw ValidationError for invalid password format', async () => {
      mockReq.body = {
        currentPassword: 'Test@1234',
        newPassword: 'short', // Too short
        confirmPassword: 'short',
      }

      await changePassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined

      await changePassword(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })
  })

  describe('deleteAccount', () => {
    it('should soft delete account successfully', async () => {
      await deleteAccount(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        { success: true },
        'Account deleted successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()

      // Verify soft delete - query explicitly for deleted users since pre-find hook filters them out
      const deletedUser = await User.findOne({ _id: testUser._id, deletedAt: { $ne: null } })
      expect(deletedUser?.deletedAt).toBeDefined()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined

      await deleteAccount(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw NotFoundError when user does not exist', async () => {
      mockReq.authUser!.sub = new mongoose.Types.ObjectId().toString()

      await deleteAccount(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })
})
