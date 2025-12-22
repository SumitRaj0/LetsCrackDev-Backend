/**
 * Course Schema Tests
 */

import {
  createCourseSchema,
  updateCourseSchema,
  getCoursesQuerySchema,
  lessonSchema,
} from '../../../modules/courses/course.schema'

describe('Course Schemas', () => {
  describe('lessonSchema', () => {
    it('should validate valid lesson data', () => {
      const validData = {
        title: 'Introduction to React',
        description: 'Learn the basics of React',
        videoUrl: 'https://example.com/video.mp4',
        freePreview: true,
        duration: 300,
        order: 1,
      }

      const result = lessonSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject title shorter than 3 characters', () => {
      const invalidData = {
        title: 'AB',
        videoUrl: 'https://example.com/video.mp4',
        order: 1,
      }

      const result = lessonSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid video URL', () => {
      const invalidData = {
        title: 'Valid Title',
        videoUrl: 'not-a-url',
        order: 1,
      }

      const result = lessonSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields', () => {
      const validData = {
        title: 'Introduction',
        videoUrl: 'https://example.com/video.mp4',
        order: 1,
      }

      const result = lessonSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('createCourseSchema', () => {
    it('should validate valid course data', () => {
      const validData = {
        title: 'Complete React Course',
        description: 'Learn React from scratch to advanced level',
        price: 99.99,
        category: 'Web Development',
      }

      const result = createCourseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional fields', () => {
      const validData = {
        title: 'Complete React Course',
        description: 'Learn React from scratch to advanced level',
        price: 99.99,
        category: 'Web Development',
        thumbnail: 'https://example.com/thumb.jpg',
        lessons: [],
        difficulty: 'intermediate',
        isPremium: true,
      }

      const result = createCourseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject title shorter than 3 characters', () => {
      const invalidData = {
        title: 'AB',
        description: 'Valid description',
        price: 99.99,
        category: 'Web Development',
      }

      const result = createCourseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject description shorter than 10 characters', () => {
      const invalidData = {
        title: 'Valid Title',
        description: 'Short',
        price: 99.99,
        category: 'Web Development',
      }

      const result = createCourseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject negative price', () => {
      const invalidData = {
        title: 'Valid Title',
        description: 'Valid description here',
        price: -10,
        category: 'Web Development',
      }

      const result = createCourseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid difficulty', () => {
      const invalidData = {
        title: 'Valid Title',
        description: 'Valid description here',
        price: 99.99,
        category: 'Web Development',
        difficulty: 'expert',
      }

      const result = createCourseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateCourseSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        title: 'Updated Title',
      }

      const result = updateCourseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept all optional fields', () => {
      const validData = {
        title: 'Updated Title',
        description: 'Updated description',
        price: 149.99,
        category: 'Updated Category',
        difficulty: 'advanced',
        isPremium: true,
      }

      const result = updateCourseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid values in update', () => {
      const invalidData = {
        price: -10,
      }

      const result = updateCourseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('getCoursesQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        page: '1',
        limit: '10',
        category: 'Web Development',
        difficulty: 'beginner',
        isPremium: 'true',
        minPrice: '0',
        maxPrice: '100',
        search: 'react',
      }

      const result = getCoursesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
        expect(result.data.isPremium).toBe(true)
      }
    })

    it('should use default values for missing parameters', () => {
      const validData = {}

      const result = getCoursesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should transform string numbers to numbers', () => {
      const validData = {
        page: '5',
        limit: '20',
      }

      const result = getCoursesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.page).toBe('number')
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should transform isPremium string to boolean', () => {
      const validData = {
        isPremium: 'false',
      }

      const result = getCoursesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isPremium).toBe(false)
      }
    })

    it('should reject invalid page number', () => {
      const invalidData = {
        page: 'abc',
      }

      const result = getCoursesQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
