/**
 * Validation Middleware Tests
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validation'
import { ValidationError } from '../../utils/errors'

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {}
    mockRes = {}
    mockNext = jest.fn()
  })

  it('should validate request body and call next on success', async () => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
    })

    mockReq.body = { name: 'John Doe', email: 'john@example.com' }

    const middleware = validate(schema)
    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
    expect((mockReq as any).validated.body).toEqual(mockReq.body)
  })

  it('should validate request query when location is query', async () => {
    const schema = z.object({
      page: z.coerce.number().int().positive(),
    })

    mockReq.query = { page: '2' }

    const middleware = validate(schema, { location: 'query' })
    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
    expect((mockReq as any).validated.query).toEqual({ page: 2 })
  })

  it('should pass BadRequestError to next on failure', async () => {
    const schema = z.object({
      email: z.string().email(),
    })

    mockReq.body = { email: 'not-an-email' }

    const middleware = validate(schema)
    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
    const err = (mockNext as jest.Mock).mock.calls[0][0]
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.message).toBeDefined()
  })
})
