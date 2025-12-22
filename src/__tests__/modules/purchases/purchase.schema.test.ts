/**
 * Purchase Schema Tests
 */

import {
  createCheckoutSchema,
  getPurchasesQuerySchema,
} from '../../../modules/purchases/purchase.schema'

describe('Purchase Schemas', () => {
  describe('createCheckoutSchema', () => {
    it('should validate checkout data for service', () => {
      const validData = {
        purchaseType: 'service',
        serviceId: 'service123',
      }

      const result = createCheckoutSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate checkout data for course', () => {
      const validData = {
        purchaseType: 'course',
        courseId: 'course123',
      }

      const result = createCheckoutSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional success and cancel URLs', () => {
      const validData = {
        purchaseType: 'service',
        serviceId: 'service123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }

      const result = createCheckoutSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid purchase type', () => {
      const invalidData = {
        purchaseType: 'invalid',
        serviceId: 'service123',
      }

      const result = createCheckoutSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid URL format', () => {
      const invalidData = {
        purchaseType: 'service',
        serviceId: 'service123',
        successUrl: 'not-a-url',
      }

      const result = createCheckoutSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('getPurchasesQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        page: 1,
        limit: 10,
        status: 'completed',
        purchaseType: 'service',
      }

      const result = getPurchasesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default values for missing parameters', () => {
      const validData = {}

      const result = getPurchasesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should coerce string numbers to numbers', () => {
      const validData = {
        page: '5',
        limit: '20',
      }

      const result = getPurchasesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.page).toBe('number')
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'invalid-status',
      }

      const result = getPurchasesQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid purchase type', () => {
      const invalidData = {
        purchaseType: 'invalid-type',
      }

      const result = getPurchasesQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const invalidData = {
        limit: 101,
      }

      const result = getPurchasesQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-positive page number', () => {
      const invalidData = {
        page: 0,
      }

      const result = getPurchasesQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
