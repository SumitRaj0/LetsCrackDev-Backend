import { Request, Response, NextFunction } from 'express'
import { Course } from './course.model'
import { createCourseSchema, updateCourseSchema, getCoursesQuerySchema } from './course.schema'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../utils/errors'
import { sendResponse } from '../../utils/response'

/**
 * Create course (Admin only)
 * POST /api/v1/courses
 */
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    const populatedCourse = await Course.findById(course._id).populate(
      'createdBy',
      'name email'
    )

    sendResponse(
      res,
      {
        course: populatedCourse,
      },
      'Course created successfully',
      201
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
  next: NextFunction
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
      'Courses retrieved successfully'
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
  next: NextFunction
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
      'Course retrieved successfully'
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
  next: NextFunction
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
      'Course updated successfully'
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
  next: NextFunction
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
    const course = await Course.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    )

    if (!course) {
      throw new NotFoundError('Course not found')
    }

    sendResponse(res, { success: true }, 'Course deleted successfully')
  } catch (error) {
    next(error)
  }
}

