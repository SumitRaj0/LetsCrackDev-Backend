import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from './user.model'
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema'
import { ValidationError, ConflictError, UnauthorizedError } from '../../utils/errors'
import { sendResponse } from '../../utils/response'
import { logger } from '../../utils/logger'
import { sendEmail } from '../../utils/email'

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET
  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET is not defined')
  }
  return secret
}

const getRefreshTokenSecret = (): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET is not defined')
  }
  return secret
}

const ACCESS_TOKEN_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) || '15m'
const REFRESH_TOKEN_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) || '7d'

function generateTokens(payload: { sub: string; role: string; email?: string }) {
  const accessTokenOptions: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  }

  const accessToken = jwt.sign(payload, getAccessTokenSecret(), accessTokenOptions)

  const refreshTokenOptions: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  }

  const refreshToken = jwt.sign(payload, getRefreshTokenSecret(), refreshTokenOptions)

  return { accessToken, refreshToken }
}

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = signupSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { name, email, password, avatar } = result.data

    const existing = await User.findOne({ email })
    if (existing) {
      throw new ConflictError('Email already in use')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const user = await User.create({
        name,
        email,
        passwordHash,
        avatar,
        role: 'user',
      })

      const tokens = generateTokens({
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
      })

      sendResponse(
        res,
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            phone: user.phone,
            createdAt: user.createdAt,
          },
          ...tokens,
        },
        'Signup successful',
        201,
      )
    } catch (createError: any) {
      // Handle MongoDB duplicate key error (E11000)
      // MongoDB duplicate key errors have code 11000
      if (createError.code === 11000) {
        throw new ConflictError('Email already in use')
      }
      throw createError
    }
  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = loginSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { email, password } = result.data

    const user = await User.findOne({ email })
    if (!user) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const tokens = generateTokens({ sub: user._id.toString(), role: user.role, email: user.email })

    sendResponse(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
        },
        ...tokens,
      },
      'Login successful',
    )
  } catch (error) {
    next(error)
  }
}

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = refreshTokenSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { refreshToken } = result.data

    try {
      const decoded = jwt.verify(refreshToken, getRefreshTokenSecret()) as {
        sub: string
        role: string
        email?: string
      }

      const tokens = generateTokens({
        sub: decoded.sub,
        role: decoded.role,
        email: decoded.email,
      })

      sendResponse(res, tokens, 'Token refreshed')
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token')
    }
  } catch (error) {
    next(error)
  }
}

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    sendResponse(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
        },
      },
      'User retrieved',
    )
  } catch (error) {
    next(error)
  }
}

export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const result = updateUserSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const updates: Record<string, unknown> = {}

    const { name, email, phone, avatar, password } = result.data

    if (name !== undefined) updates.name = name
    if (avatar !== undefined) updates.avatar = avatar
    if (phone !== undefined) updates.phone = phone

    if (email !== undefined) {
      // Ensure email is not taken by another user
      const existing = await User.findOne({ email, _id: { $ne: userId } })
      if (existing) {
        throw new ConflictError('Email already in use')
      }
      updates.email = email
    }

    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10)
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    sendResponse(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
        },
      },
      'Profile updated',
    )
  } catch (error) {
    next(error)
  }
}

export const deleteMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    await User.findByIdAndDelete(userId)

    sendResponse(res, { success: true }, 'Account deleted')
  } catch (error) {
    next(error)
  }
}

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { email } = result.data

    const user = await User.findOne({ email })

    // Don't reveal if email exists (security best practice)
    // Always return success message
    if (!user) {
      sendResponse(
        res,
        { success: true },
        'If an account with that email exists, a password reset link has been sent.',
      )
      return
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Set token expiration (1 hour)
    const resetExpires = new Date()
    resetExpires.setHours(resetExpires.getHours() + 1)

    // Save token to user
    user.passwordResetToken = resetTokenHash
    user.passwordResetExpires = resetExpires
    await user.save()

    // Build reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`

    // Log reset URL in non-production environments for easier debugging
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Password reset link generated', { email: user.email, resetUrl })
      console.log('\n🔗 Password Reset Link (Development Mode):')
      console.log(`   ${resetUrl}\n`)
    }

    // Send password reset email (real provider can be wired into sendEmail)
    let emailSent = false
    let emailError: Error | null = null
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a>`,
        text: `Click here to reset your password: ${resetUrl}`,
      })
      emailSent = true
      logger.info('Password reset email sent successfully', { email: user.email })
    } catch (err: unknown) {
      // Log the error with full details
      emailError = err instanceof Error ? err : new Error(String(err))
      const errorCode = err && typeof err === 'object' && 'code' in err ? err.code : undefined
      const errorResponse =
        err && typeof err === 'object' && 'response' in err ? err.response : undefined

      logger.error('Failed to send password reset email', {
        error: emailError.message,
        email: user.email,
        errorCode,
        errorResponse,
      })
    }

    // Check if email was actually sent (handles case where sendEmail returns without throwing)
    if (!emailSent) {
      const isDevelopment = process.env.NODE_ENV !== 'production'
      const errorMessage = emailError?.message || 'GMAIL_APP_PASSWORD is not configured'

      // In development or if email fails, return reset URL in response as fallback
      // This allows users to still reset their password even if email fails
      if (isDevelopment) {
        logger.warn('Email sending failed, but reset link is available in response', {
          error: errorMessage,
          resetUrlProvided: true,
        })
        sendResponse(
          res,
          {
            success: true,
            resetUrl: resetUrl, // Always include reset URL if email fails
            emailSent: false,
            error: errorMessage,
          },
          'Password reset link generated. Email sending failed - use the reset URL provided in the response.',
        )
        return
      } else {
        // In production, if email fails, throw error
        if (emailError) {
          throw emailError
        } else {
          throw new Error('GMAIL_APP_PASSWORD is not configured. Cannot send email in production.')
        }
      }
    }

    sendResponse(
      res,
      {
        success: true,
        resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
        emailSent: true,
      },
      'If an account with that email exists, a password reset link has been sent.',
    )
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = resetPasswordSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { token, password } = result.data

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: new Date() }, // Token not expired
    })

    if (!user) {
      throw new UnauthorizedError('Invalid or expired reset token')
    }

    // Update password
    user.passwordHash = await bcrypt.hash(password, 10)
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    sendResponse(res, { success: true }, 'Password reset successful')
  } catch (error) {
    next(error)
  }
}
