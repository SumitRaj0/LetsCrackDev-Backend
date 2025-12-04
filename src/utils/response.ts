/**
 * Global Response Wrapper
 */

import { Response } from 'express'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  meta?: unknown
}

export const sendResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: unknown
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta,
  }
  res.status(statusCode).json(response)
}

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: error || message,
  }
  res.status(statusCode).json(response)
}

