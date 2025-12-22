/**
 * Course Controller Tests
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { Course } from '@/modules/courses/course.model'
import { User } from '@/modules/auth/user.model'
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from '@/modules/courses/course.controller'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'

jest.mock('../../../utils/response')

describe('Course Controller', () => {
  let mockReq: Partial<Request & { authUser?: { sub?: string; role?: string } }>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let adminUser: any

  beforeEach(async () => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      authUser: { sub: '', role: 'admin' },
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: 'admin',
    })
    mockReq.authUser!.sub = adminUser._id.toString()
  })

  afterEach(async () => {
    await Course.deleteMany({})
    await User.deleteMany({})
    jest.clearAllMocks()
  })

  describe('createCourse', () => {
    const validCourseData = {
      title: 'Test Course',
      description: 'This is a test course description',
      price: 99.99,
      category: 'Web Development',
      difficulty: 'beginner' as const,
      isPremium: false,
      lessons: [
        {
          title: 'Lesson 1',
          description: 'First lesson',
          videoUrl: 'https://example.com/video1',
          freePreview: true,
          order: 1,
        },
      ],
    }

    it('should create course successfully for admin', async () => {
      mockReq.body = validCourseData

      await createCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          course: expect.objectContaining({
            title: 'Test Course',
            price: 99.99,
          }),
        }),
        'Course created successfully',
        201
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should sort lessons by order', async () => {
      mockReq.body = {
        ...validCourseData,
        lessons: [
          { title: 'Lesson 3', videoUrl: 'https://example.com/v3', order: 3, freePreview: false },
          { title: 'Lesson 1', videoUrl: 'https://example.com/v1', order: 1, freePreview: true },
          { title: 'Lesson 2', videoUrl: 'https://example.com/v2', order: 2, freePreview: false },
        ],
      }

      await createCourse(mockReq as Request, mockRes as Response, mockNext)

      const course = await Course.findOne({ title: 'Test Course' })
      expect(course?.lessons[0].order).toBe(1)
      expect(course?.lessons[1].order).toBe(2)
      expect(course?.lessons[2].order).toBe(3)
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.body = validCourseData

      await createCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.body = validCourseData

      await createCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.body = {
        title: 'AB', // Too short
        description: 'Short', // Too short
        price: -10, // Negative price
      }

      await createCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('getCourses', () => {
    beforeEach(async () => {
      // Create test courses
      await Course.create({
        title: 'Course 1',
        description: 'Description 1',
        price: 50,
        category: 'Web Development',
        difficulty: 'beginner',
        isPremium: false,
        createdBy: adminUser._id,
      })
      await Course.create({
        title: 'Course 2',
        description: 'Description 2',
        price: 100,
        category: 'Mobile Development',
        difficulty: 'intermediate',
        isPremium: true,
        createdBy: adminUser._id,
      })
    })

    it('should get all courses with default pagination', async () => {
      mockReq.query = {}

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          courses: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
          }),
        }),
        'Courses retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should filter courses by category', async () => {
      mockReq.query = { category: 'Web Development' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const courses = callArgs[1].courses
      expect(courses.every((c: any) => c.category === 'Web Development')).toBe(true)
    })

    it('should filter courses by difficulty', async () => {
      mockReq.query = { difficulty: 'intermediate' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const courses = callArgs[1].courses
      expect(courses.every((c: any) => c.difficulty === 'intermediate')).toBe(true)
    })

    it('should filter courses by isPremium', async () => {
      mockReq.query = { isPremium: 'true' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const courses = callArgs[1].courses
      expect(courses.every((c: any) => c.isPremium === true)).toBe(true)
    })

    it('should filter courses by price range', async () => {
      mockReq.query = { minPrice: '75', maxPrice: '125' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const courses = callArgs[1].courses
      expect(courses.every((c: any) => c.price >= 75 && c.price <= 125)).toBe(true)
    })

    it('should search courses by title, description, or category', async () => {
      mockReq.query = { search: 'Mobile' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const courses = callArgs[1].courses
      expect(courses.length).toBeGreaterThan(0)
    })

    it('should handle pagination correctly', async () => {
      mockReq.query = { page: '1', limit: '1' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      expect(callArgs[1].pagination.page).toBe(1)
      expect(callArgs[1].pagination.limit).toBe(1)
      expect(callArgs[1].courses.length).toBe(1)
    })

    it('should throw ValidationError for invalid query parameters', async () => {
      mockReq.query = { page: 'invalid', limit: 'abc' }

      await getCourses(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('getCourseById', () => {
    let testCourse: any

    beforeEach(async () => {
      testCourse = await Course.create({
        title: 'Test Course',
        description: 'Test Description',
        price: 99.99,
        category: 'Web Development',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
    })

    it('should get course by ID successfully', async () => {
      mockReq.params = { id: testCourse._id.toString() }

      await getCourseById(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          course: expect.objectContaining({
            title: 'Test Course',
          }),
        }),
        'Course retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ValidationError when ID is missing', async () => {
      mockReq.params = {}

      await getCourseById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when course does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }

      await getCourseById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('updateCourse', () => {
    let testCourse: any

    beforeEach(async () => {
      testCourse = await Course.create({
        title: 'Original Title',
        description: 'Original Description',
        price: 50,
        category: 'Web Development',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
    })

    it('should update course successfully for admin', async () => {
      mockReq.params = { id: testCourse._id.toString() }
      mockReq.body = {
        title: 'Updated Title',
        price: 75,
      }

      await updateCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          course: expect.objectContaining({
            title: 'Updated Title',
            price: 75,
          }),
        }),
        'Course updated successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should sort lessons by order when updating', async () => {
      jest.clearAllMocks() // Clear previous mocks
      mockReq.params = { id: testCourse._id.toString() }
      mockReq.body = {
        lessons: [
          { title: 'Lesson Three', description: 'Lesson 3', videoUrl: 'https://example.com/v3', order: 3, freePreview: false },
          { title: 'Lesson One', description: 'Lesson 1', videoUrl: 'https://example.com/v1', order: 1, freePreview: true },
          { title: 'Lesson Two', description: 'Lesson 2', videoUrl: 'https://example.com/v2', order: 2, freePreview: false },
        ],
      }

      await updateCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(sendResponse).toHaveBeenCalled()
      
      // Verify lessons were sorted by checking the response
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const course = callArgs[1].course
      expect(course.lessons).toBeDefined()
      expect(course.lessons.length).toBe(3)
      expect(course.lessons[0].order).toBe(1)
      expect(course.lessons[0].title).toBe('Lesson One')
      expect(course.lessons[1].order).toBe(2)
      expect(course.lessons[1].title).toBe('Lesson Two')
      expect(course.lessons[2].order).toBe(3)
      expect(course.lessons[2].title).toBe('Lesson Three')
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testCourse._id.toString() }
      mockReq.body = { title: 'Updated' }

      await updateCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.params = { id: testCourse._id.toString() }
      mockReq.body = { title: 'Updated' }

      await updateCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw NotFoundError when course does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }
      mockReq.body = { title: 'Updated' }

      await updateCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.params = { id: testCourse._id.toString() }
      mockReq.body = {
        title: 'AB', // Too short
        price: -10, // Negative
      }

      await updateCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('deleteCourse', () => {
    let testCourse: any

    beforeEach(async () => {
      testCourse = await Course.create({
        title: 'Course to Delete',
        description: 'Description',
        price: 50,
        category: 'Web Development',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
    })

    it('should soft delete course successfully for admin', async () => {
      mockReq.params = { id: testCourse._id.toString() }

      await deleteCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        { success: true },
        'Course deleted successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()

      // Verify soft delete - course should not be found in normal queries
      const normalQuery = await Course.findById(testCourse._id)
      expect(normalQuery).toBeNull() // Should be null due to soft delete pre-find hook
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testCourse._id.toString() }

      await deleteCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.params = { id: testCourse._id.toString() }

      await deleteCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw NotFoundError when course does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }

      await deleteCourse(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })
})
