/**
 * Central Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { AppError, ValidationError, NotFoundError, BadRequestError } from '../utils/errors'
import { logger } from '../utils/logger'
import { sendError } from '../utils/response'

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Handle MongoDB CastError (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    const message = `Invalid ${err.path || 'ID'} format`
    logger.error(message, err, {
      path: req.path,
      method: req.method,
      kind: err.kind,
    })
    return sendError(res, message, 400)
  }

  // Handle MongoDB ValidationError
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ')
    logger.error('Validation error', err, {
      path: req.path,
      method: req.method,
    })
    return sendError(res, message, 400)
  }

  // Handle MongoDB duplicate key error
  if (err instanceof Error && 'code' in err && err.code === 11000 && 'keyPattern' in err) {
    const duplicateKey = Object.keys(
      (err as mongoose.Error & { keyPattern: Record<string, unknown> }).keyPattern,
    )[0]
    const message = `${duplicateKey} already exists`
    logger.error('Duplicate key error', err, {
      path: req.path,
      method: req.method,
    })
    return sendError(res, message, 409)
  }

  // Handle network/connection errors
  if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
    logger.error('Database connection error', err, {
      path: req.path,
      method: req.method,
    })
    return sendError(res, 'Service temporarily unavailable. Please try again later.', 503)
  }

  // Handle timeout errors
  if (
    err instanceof Error &&
    (err.message.includes('timeout') || err.name === 'MongooseTimeoutError')
  ) {
    logger.error('Request timeout', err, {
      path: req.path,
      method: req.method,
    })
    return sendError(res, 'Request timeout. Please try again.', 504)
  }

  // Log error
  if (err instanceof AppError) {
    logger.error(err.message, err, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    })
  } else {
    logger.error('Unhandled error', err, {
      path: req.path,
      method: req.method,
      stack: err.stack,
    })
  }

  // Send error response
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode)
  } else {
    // Don't leak error details in production
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'An unexpected error occurred'
    sendError(res, message, 500)
  }
}
