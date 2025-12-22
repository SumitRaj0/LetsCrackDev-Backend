import { Request, Response, NextFunction } from 'express'
import { Course } from './course.model'
import { User } from '../auth/user.model'
import { createCourseSchema, updateCourseSchema, getCoursesQuerySchema } from './course.schema'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../utils/errors'
import { sendResponse } from '../../utils/response'

/**
 * Create course (Admin only)
 * POST /api/v1/courses
 */
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userId = authUser?.sub
    const userRole = authUser?.role

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    const result = createCourseSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    // Sort lessons by order
    const sortedLessons = result.data.lessons
      ? [...result.data.lessons].sort((a, b) => a.order - b.order)
      : []

    const course = await Course.create({
      ...result.data,
      lessons: sortedLessons,
      createdBy: userId,
    })

    const populatedCourse = await Course.findById(course._id).populate('createdBy', 'name email')

    sendResponse(
      res,
      {
        course: populatedCourse,
      },
      'Course created successfully',
      201,
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get all courses (Public - with filters, pagination)
 * GET /api/v1/courses
 */
export const getCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = getCoursesQuerySchema.safeParse(req.query)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { page, limit, category, difficulty, isPremium, minPrice, maxPrice, search } = result.data

    // Build query
    const query: Record<string, unknown> = {}

    if (category) {
      query.category = { $regex: category, $options: 'i' }
    }

    if (difficulty) {
      query.difficulty = difficulty
    }

    if (isPremium !== undefined) {
      query.isPremium = isPremium
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {}
      if (minPrice !== undefined) {
        ;(query.price as Record<string, unknown>).$gte = minPrice
      }
      if (maxPrice !== undefined) {
        ;(query.price as Record<string, unknown>).$lte = maxPrice
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ]
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const total = await Course.countDocuments(query)

    // Get courses
    const courses = await Course.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const totalPages = Math.ceil(total / limit)

    sendResponse(
      res,
      {
        courses,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      'Courses retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get course by ID
 * GET /api/v1/courses/:id
 */
export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError('Course ID is required')
    }

    const course = await Course.findById(id).populate('createdBy', 'name email')

    if (!course) {
      throw new NotFoundError('Course not found')
    }

    sendResponse(
      res,
      {
        course,
      },
      'Course retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Update course (Admin only)
 * PATCH /api/v1/courses/:id
 */
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userId = authUser?.sub
    const userRole = authUser?.role

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    const { id } = req.params

    if (!id) {
      throw new ValidationError('Course ID is required')
    }

    const result = updateCourseSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    // Sort lessons by order if lessons are being updated
    const updates: Record<string, unknown> = { ...result.data }
    if (result.data.lessons) {
      updates.lessons = [...result.data.lessons].sort((a, b) => a.order - b.order)
    }

    const course = await Course.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email')

    if (!course) {
      throw new NotFoundError('Course not found')
    }

    sendResponse(
      res,
      {
        course,
      },
      'Course updated successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Delete course (Admin only - soft delete)
 * DELETE /api/v1/courses/:id
 */
export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userId = authUser?.sub
    const userRole = authUser?.role

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    const { id } = req.params

    if (!id) {
      throw new ValidationError('Course ID is required')
    }

    // Soft delete
    const course = await Course.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })

    if (!course) {
      throw new NotFoundError('Course not found')
    }

    sendResponse(res, { success: true }, 'Course deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Enroll in course (Authenticated users)
 * POST /api/v1/courses/:id/enroll
 */
export const enrollInCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { id } = req.params

    if (!id) {
      throw new ValidationError('Course ID is required')
    }

    // Check if course exists
    const course = await Course.findById(id)
    if (!course) {
      throw new NotFoundError('Course not found')
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Check if already enrolled
    const isEnrolled = user.enrolledCourses.some(
      (enrollment) => enrollment.courseId.toString() === id,
    )

    if (isEnrolled) {
      throw new ConflictError('You are already enrolled in this course')
    }

    // Add enrollment
    user.enrolledCourses.push({
      courseId: course._id,
      progress: 0,
      completedLessons: [],
      enrolledAt: new Date(),
    })
    await user.save()

    sendResponse(
      res,
      {
        enrollment: {
          courseId: course._id,
          progress: 0,
          enrolledAt: new Date(),
        },
      },
      'Successfully enrolled in course',
      201,
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get user enrollment for a course (Authenticated users)
 * GET /api/v1/courses/:id/enrollment
 */
export const getCourseEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { id } = req.params

    if (!id) {
      throw new ValidationError('Course ID is required')
    }

    // Check if course exists
    const course = await Course.findById(id)
    if (!course) {
      throw new NotFoundError('Course not found')
    }

    // Get user with enrollment
    const user = await User.findById(userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Find enrollment
    const enrollment = user.enrolledCourses.find(
      (enrollment) => enrollment.courseId.toString() === id,
    )

    if (!enrollment) {
      // Return empty enrollment if not enrolled
      sendResponse(
        res,
        {
          enrollment: null,
          isEnrolled: false,
        },
        'User is not enrolled in this course',
      )
      return
    }

    sendResponse(
      res,
      {
        enrollment: {
          courseId: enrollment.courseId,
          progress: enrollment.progress,
          completedLessons: enrollment.completedLessons,
          enrolledAt: enrollment.enrolledAt,
        },
        isEnrolled: true,
      },
      'Enrollment data retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Update course progress (Authenticated users)
 * PATCH /api/v1/courses/:id/progress
 */
export const updateCourseProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { id } = req.params
    const { progress, completedLessons } = req.body

    if (!id) {
      throw new ValidationError('Course ID is required')
    }

    // Validate progress (0-100)
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      throw new ValidationError('Progress must be between 0 and 100')
    }

    // Check if course exists
    const course = await Course.findById(id)
    if (!course) {
      throw new NotFoundError('Course not found')
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Find enrollment
    const enrollmentIndex = user.enrolledCourses.findIndex(
      (enrollment) => enrollment.courseId.toString() === id,
    )

    if (enrollmentIndex === -1) {
      throw new NotFoundError('You are not enrolled in this course')
    }

    // Update progress
    if (progress !== undefined) {
      user.enrolledCourses[enrollmentIndex].progress = Math.min(100, Math.max(0, progress))
    }

    // Update completed lessons if provided
    if (completedLessons && Array.isArray(completedLessons)) {
      user.enrolledCourses[enrollmentIndex].completedLessons = completedLessons
    }

    await user.save()

    sendResponse(
      res,
      {
        enrollment: user.enrolledCourses[enrollmentIndex],
      },
      'Course progress updated successfully',
    )
  } catch (error) {
    next(error)
  }
}
