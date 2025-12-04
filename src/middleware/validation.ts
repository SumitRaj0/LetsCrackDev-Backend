/**
 * Validation Middleware
 * Placeholder for Zod validation (to be implemented in later phases)
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Placeholder validation middleware
 * Replace this with Zod schema validation in later phases
 */
export const validate = (_schema: unknown) => {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    // TODO: Implement Zod validation
    // For now, just pass through
    next()
  }
}

