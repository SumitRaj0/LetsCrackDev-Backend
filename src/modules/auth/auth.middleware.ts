import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UnauthorizedError, ForbiddenError } from '../../utils/errors'

export interface JwtUserPayload {
  sub: string
  role: 'user' | 'admin'
  email?: string
}

declare module 'express-serve-static-core' {
  // This is only for type help in this module; we won't rely on it globally yet
  interface Request {
    authUser?: JwtUserPayload
  }
}

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET
  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET is not defined')
  }
  return secret
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing')
    }

    const token = authHeader.substring(7)
    const payload = jwt.verify(token, getAccessTokenSecret()) as JwtUserPayload

    ;(req as Request & { authUser?: JwtUserPayload }).authUser = {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    }

    next()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error
    }
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const user = (req as Request & { authUser?: JwtUserPayload }).authUser

  if (!user) {
    throw new UnauthorizedError('Not authenticated')
  }

  if (user.role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }

  next()
}


