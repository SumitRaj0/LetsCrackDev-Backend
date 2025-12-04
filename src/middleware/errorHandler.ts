/**
 * Central Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import { sendError } from '../utils/response'

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
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
    })
  }

  // Send error response
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode)
  } else {
    // Don't leak error details in production
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    sendError(res, message, 500)
  }
}

