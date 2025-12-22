/**
 * Not Found Middleware Tests
 */

import { Request, Response, NextFunction } from 'express'
import { notFoundHandler } from '../../middleware/notFound'
import { NotFoundError } from '../../utils/errors'

describe('Not Found Handler', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/nonexistent',
    } as Partial<Request>
    mockRes = {} as Partial<Response>
    mockNext = jest.fn() as jest.MockedFunction<NextFunction>
  })

  it('should call next with NotFoundError', () => {
    notFoundHandler(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
    const error = (mockNext as jest.MockedFunction<NextFunction>).mock.calls[0][0] as unknown
    expect(error).toBeInstanceOf(NotFoundError)
    expect((error as NotFoundError).message).toBe('Route GET /api/nonexistent not found')
  })

  it('should include method and path in error message', () => {
    const testReq = {
      ...mockReq,
      method: 'POST',
      path: '/api/test',
    } as Request
    
    notFoundHandler(testReq, mockRes as Response, mockNext)

    const error = (mockNext as jest.MockedFunction<NextFunction>).mock.calls[0][0] as unknown
    expect((error as NotFoundError).message).toBe('Route POST /api/test not found')
  })
})
