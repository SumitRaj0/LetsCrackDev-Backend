import type { Request, Response, NextFunction } from 'express'
import type { AnyZodObject, ZodError, ZodTypeAny } from 'zod'
import { ValidationError } from '../utils/errors'

type ValidationLocation = 'body' | 'query' | 'params'

interface ValidationOptions {
  location?: ValidationLocation
}

/**
 * Zod-based validation middleware.
 *
 * Usage: validate(schema, { location: 'body' | 'query' | 'params' })
 * Defaults to validating req.body.
 *
 * Note: we accept Zod effects and other derived types by typing the schema
 * parameter as ZodTypeAny while still enforcing AnyZodObject at runtime,
 * so refine() / transform() chains keep working with proper type-safety.
 */
export const validate = (schema: ZodTypeAny, options: ValidationOptions = {}) => {
  const location: ValidationLocation = options.location || 'body'

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[location]

      // At runtime, ensure we only work with object-like schemas (body/query/params)
      const objectSchema = schema as unknown as AnyZodObject
      const parsed = await objectSchema.parseAsync(dataToValidate)

      // Attach parsed/typed data for downstream handlers if needed
      ;(req as any).validated = (req as any).validated || {}
      ;(req as any).validated[location] = parsed

      next()
    } catch (err) {
      const zodError = err as ZodError
      const issues = zodError.issues || []
      const message =
        issues.length > 0
          ? issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
          : 'Invalid request data'

      // Log validation errors for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.error('Validation error:', {
          path: req.path,
          body: req.body,
          issues: issues.map((i) => ({ path: i.path, message: i.message, code: i.code })),
        })
      }

      next(new ValidationError(message))
    }
  }
}
