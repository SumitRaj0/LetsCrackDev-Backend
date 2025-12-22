/**
 * Auth Schema Tests
 */

import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../modules/auth/auth.schema'

describe('Auth Schemas', () => {
  describe('signupSchema', () => {
    it('should validate valid signup data', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!@#',
      }

      const result = signupSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123!@#',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('uppercase')
      }
    })

    it('should reject password without lowercase letter', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TEST123!@#',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password without number', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test!@#',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password without special character', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1!',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Test123!@#',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept optional avatar URL', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!@#',
        avatar: 'https://example.com/avatar.jpg',
      }

      const result = signupSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'A',
        email: 'test@example.com',
        password: 'Test123!@#',
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'valid-refresh-token-string',
      }

      const result = refreshTokenSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject token shorter than 10 characters', () => {
      const invalidData = {
        refreshToken: 'short',
      }

      const result = refreshTokenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateUserSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '1234567890',
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept partial updates', () => {
      const validData = {
        name: 'Updated Name',
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate password update with requirements', () => {
      const validData = {
        password: 'NewPass123!@#',
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid password in update', () => {
      const invalidData = {
        password: 'weak',
      }

      const result = updateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email in update', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      const result = updateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('forgotPasswordSchema', () => {
    it('should validate valid email', () => {
      const validData = {
        email: 'test@example.com',
      }

      const result = forgotPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      const result = forgotPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    it('should validate valid reset password data', () => {
      const validData = {
        token: 'valid-reset-token',
        password: 'NewPass123!@#',
      }

      const result = resetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject token shorter than 10 characters', () => {
      const invalidData = {
        token: 'short',
        password: 'NewPass123!@#',
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject weak password', () => {
      const invalidData = {
        token: 'valid-reset-token',
        password: 'weak',
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
