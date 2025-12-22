/**
 * User Schema Tests
 */

import {
  updateProfileSchema,
  changePasswordSchema,
} from '../../../modules/user/user.schema'

describe('User Schemas', () => {
  describe('updateProfileSchema', () => {
    it('should validate valid profile update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '1234567890',
        avatar: 'https://example.com/avatar.jpg',
      }

      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept partial updates', () => {
      const validData = {
        name: 'Updated Name',
      }

      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'A',
      }

      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid avatar URL', () => {
      const invalidData = {
        avatar: 'not-a-url',
      }

      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    it('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!@#',
        confirmPassword: 'NewPass123!@#',
      }

      const result = changePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject when new password and confirm password do not match', () => {
      const invalidData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!@#',
        confirmPassword: 'DifferentPass123!',
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("don't match")
      }
    })

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        currentPassword: 'Short1!',
        newPassword: 'Short2!',
        confirmPassword: 'Short2!',
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'A'.repeat(129)
      const invalidData = {
        currentPassword: 'CurrentPass123!',
        newPassword: longPassword,
        confirmPassword: longPassword,
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
