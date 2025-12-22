/**
 * Response Utility Tests
 */

import { Response } from 'express'
import { sendResponse, sendError } from '../../utils/response'

describe('Response Utils', () => {
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
  })

  describe('sendResponse', () => {
    it('should send success response with data', () => {
      const data = { id: 1, name: 'Test' }
      sendResponse(mockRes as Response, data, 'Success')

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Success',
      })
    })

    it('should send success response without message', () => {
      const data = { id: 1 }
      sendResponse(mockRes as Response, data)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      })
    })

    it('should send success response with custom status code', () => {
      const data = { id: 1 }
      sendResponse(mockRes as Response, data, 'Created', 201)

      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Created',
      })
    })

    it('should send success response with meta', () => {
      const data = { items: [] }
      const meta = { total: 0, page: 1 }
      sendResponse(mockRes as Response, data, 'Success', 200, meta)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Success',
        meta,
      })
    })
  })

  describe('sendError', () => {
    it('should send error response with default status code', () => {
      sendError(mockRes as Response, 'Error occurred')

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error occurred',
        error: 'Error occurred',
      })
    })

    it('should send error response with custom status code', () => {
      sendError(mockRes as Response, 'Not found', 404)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not found',
        error: 'Not found',
      })
    })

    it('should send error response with custom error message', () => {
      sendError(mockRes as Response, 'User friendly message', 400, 'Technical error details')

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User friendly message',
        error: 'Technical error details',
      })
    })
  })
})
