/**
 * Custom Error Classes Tests
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../utils/errors'

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with default status code', () => {
      const error = new AppError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
    })

    it('should create AppError with custom status code', () => {
      const error = new AppError('Test error', 400)
      expect(error.statusCode).toBe(400)
    })

    it('should have stack trace', () => {
      const error = new AppError('Test error')
      expect(error.stack).toBeDefined()
    })
  })

  describe('ValidationError', () => {
    it('should create ValidationError with 400 status code', () => {
      const error = new ValidationError('Invalid input')
      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('ValidationError')
      expect(error).toBeInstanceOf(AppError)
    })
  })

  describe('NotFoundError', () => {
    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError()
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('NotFoundError')
    })

    it('should create NotFoundError with custom resource name', () => {
      const error = new NotFoundError('User')
      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('UnauthorizedError', () => {
    it('should create UnauthorizedError with default message', () => {
      const error = new UnauthorizedError()
      expect(error.message).toBe('Unauthorized')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('UnauthorizedError')
    })

    it('should create UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Invalid token')
      expect(error.message).toBe('Invalid token')
      expect(error.statusCode).toBe(401)
    })
  })

  describe('ForbiddenError', () => {
    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError()
      expect(error.message).toBe('Forbidden')
      expect(error.statusCode).toBe(403)
      expect(error.name).toBe('ForbiddenError')
    })

    it('should create ForbiddenError with custom message', () => {
      const error = new ForbiddenError('Access denied')
      expect(error.message).toBe('Access denied')
      expect(error.statusCode).toBe(403)
    })
  })

  describe('ConflictError', () => {
    it('should create ConflictError with message', () => {
      const error = new ConflictError('Email already exists')
      expect(error.message).toBe('Email already exists')
      expect(error.statusCode).toBe(409)
      expect(error.name).toBe('ConflictError')
    })
  })
})
