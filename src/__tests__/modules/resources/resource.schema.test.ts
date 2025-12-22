/**
 * Resource Schema Tests
 */

import {
  createResourceSchema,
  updateResourceSchema,
  getResourcesQuerySchema,
} from '../../../modules/resources/resource.schema'

describe('Resource Schemas', () => {
  describe('createResourceSchema', () => {
    it('should validate valid resource data', () => {
      const validData = {
        title: 'React Documentation',
        description: 'Complete guide to React framework',
        category: 'Documentation',
        link: 'https://react.dev',
      }

      const result = createResourceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional fields', () => {
      const validData = {
        title: 'React Documentation',
        description: 'Complete guide to React framework',
        category: 'Documentation',
        link: 'https://react.dev',
        thumbnail: 'https://example.com/thumb.jpg',
        tags: ['react', 'javascript'],
        difficulty: 'intermediate',
      }

      const result = createResourceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject title shorter than 3 characters', () => {
      const invalidData = {
        title: 'AB',
        description: 'Valid description',
        category: 'Category',
        link: 'https://example.com',
      }

      const result = createResourceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid URL', () => {
      const invalidData = {
        title: 'Valid Title',
        description: 'Valid description',
        category: 'Category',
        link: 'not-a-url',
      }

      const result = createResourceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid difficulty', () => {
      const invalidData = {
        title: 'Valid Title',
        description: 'Valid description',
        category: 'Category',
        link: 'https://example.com',
        difficulty: 'expert',
      }

      const result = createResourceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateResourceSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        title: 'Updated Title',
      }

      const result = updateResourceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept all optional fields', () => {
      const validData = {
        title: 'Updated Title',
        description: 'Updated description',
        category: 'Updated Category',
        tags: ['tag1', 'tag2'],
        link: 'https://updated.com',
        thumbnail: 'https://example.com/thumb.jpg',
        difficulty: 'advanced',
      }

      const result = updateResourceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('getResourcesQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        page: '1',
        limit: '10',
        category: 'Documentation',
        tags: 'react,javascript',
        difficulty: 'beginner',
        search: 'react',
      }

      const result = getResourcesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default values for missing parameters', () => {
      const validData = {}

      const result = getResourcesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })
  })
})
