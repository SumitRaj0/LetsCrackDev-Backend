import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { User } from './user.model'
import { signupSchema, loginSchema, refreshTokenSchema, updateUserSchema } from './auth.schema'
import { ValidationError, ConflictError, UnauthorizedError } from '../../utils/errors'
import { sendResponse } from '../../utils/response'

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

  const accessToken = jwt.sign(
    payload,
    getAccessTokenSecret(),
    accessTokenOptions
  )

  const refreshTokenOptions: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  }

  const refreshToken = jwt.sign(
    payload,
    getRefreshTokenSecret(),
    refreshTokenOptions
  )

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

    const user = await User.create({
      name,
      email,
      passwordHash,
      avatar,
      role: 'user',
    })

    const tokens = generateTokens({ sub: user._id.toString(), role: user.role, email: user.email })

    sendResponse(res, {
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
    }, 'Signup successful', 201)
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

    sendResponse(res, {
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
    }, 'Login successful')
  } catch (error) {
    next(error)
  }
}

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    sendResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    }, 'User retrieved')
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

    sendResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    }, 'Profile updated')
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


