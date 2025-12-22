/**
 * Service Schema Tests
 */

import {
  createServiceSchema,
  updateServiceSchema,
  getServicesQuerySchema,
} from '../../../modules/services/service.schema'

describe('Service Schemas', () => {
  describe('createServiceSchema', () => {
    it('should validate valid service data', () => {
      const validData = {
        name: 'Resume Review Service',
        description: 'Professional resume review and feedback',
        price: 99.99,
        category: 'resume',
        slug: 'resume-review',
      }

      const result = createServiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional fields', () => {
      const validData = {
        name: 'Resume Review Service',
        description: 'Professional resume review and feedback',
        price: 99.99,
        category: 'resume',
        slug: 'resume-review',
        deliverables: ['Resume PDF', 'Feedback document'],
        availability: true,
      }

      const result = createServiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid slug format', () => {
      const invalidData = {
        name: 'Service Name',
        description: 'Valid description',
        price: 99.99,
        category: 'resume',
        slug: 'Invalid Slug!',
      }

      const result = createServiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid category', () => {
      const invalidData = {
        name: 'Service Name',
        description: 'Valid description',
        price: 99.99,
        category: 'invalid-category',
        slug: 'service-slug',
      }

      const result = createServiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject negative price', () => {
      const invalidData = {
        name: 'Service Name',
        description: 'Valid description',
        price: -10,
        category: 'resume',
        slug: 'service-slug',
      }

      const result = createServiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept valid slug with hyphens', () => {
      const validData = {
        name: 'Service Name',
        description: 'Valid description',
        price: 99.99,
        category: 'resume',
        slug: 'resume-review-service-2024',
      }

      const result = createServiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('updateServiceSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        name: 'Updated Name',
      }

      const result = updateServiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept all optional fields', () => {
      const validData = {
        name: 'Updated Name',
        description: 'Updated description',
        price: 149.99,
        category: 'interview',
        slug: 'updated-slug',
        deliverables: ['New deliverable'],
        availability: false,
      }

      const result = updateServiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('getServicesQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        page: '1',
        limit: '10',
        category: 'resume',
        availability: 'true',
        minPrice: '0',
        maxPrice: '100',
      }

      const result = getServicesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availability).toBe(true)
      }
    })

    it('should use default values for missing parameters', () => {
      const validData = {}

      const result = getServicesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should transform availability string to boolean', () => {
      const validData = {
        availability: 'false',
      }

      const result = getServicesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availability).toBe(false)
      }
    })
  })
})
