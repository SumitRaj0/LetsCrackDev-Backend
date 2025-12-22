import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../auth/user.model'
import { updateProfileSchema, changePasswordSchema } from './user.schema'
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors'
import { sendResponse } from '../../utils/response'

/**
 * Get user profile
 * GET /api/v1/user/profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    sendResponse(
      res,
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      'Profile retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Update user profile
 * PUT /api/v1/user/profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const result = updateProfileSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { name, email, phone, avatar } = result.data

    const updates: Record<string, unknown> = {}

    if (name !== undefined) updates.name = name
    if (avatar !== undefined) updates.avatar = avatar
    if (phone !== undefined) updates.phone = phone

    if (email !== undefined) {
      // Ensure email is not taken by another user
      const existing = await User.findOne({ email, _id: { $ne: userId } })
      if (existing) {
        throw new ConflictError('Email already in use')
      }
      updates.email = email.toLowerCase().trim()
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    sendResponse(
      res,
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      'Profile updated successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Change password
 * PUT /api/v1/user/change-password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const result = changePasswordSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { currentPassword, newPassword } = result.data

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect')
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await User.findByIdAndUpdate(userId, { passwordHash })

    sendResponse(res, { success: true }, 'Password changed successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete account (soft delete)
 * DELETE /api/v1/user/account
 */
export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    // Soft delete: Set deletedAt timestamp instead of removing the document
    const user = await User.findByIdAndUpdate(
      userId,
      { deletedAt: new Date() },
      { new: true }
    )

    if (!user) {
      throw new NotFoundError('User not found')
    }

    sendResponse(res, { success: true }, 'Account deleted successfully')
  } catch (error) {
    next(error)
  }
}

