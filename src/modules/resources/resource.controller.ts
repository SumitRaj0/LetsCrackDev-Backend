import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { Resource } from './resource.model'
import { User } from '../auth/user.model'
import {
  createResourceSchema,
  updateResourceSchema,
  getResourcesQuerySchema,
} from './resource.schema'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../utils/errors'
import { sendResponse } from '../../utils/response'
import { logger } from '../../utils/logger'

/**
 * Create resource (Admin only)
 * POST /api/v1/resources
 */
export const createResource = async (
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

    const result = createResourceSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const resource = await Resource.create({
      ...result.data,
      status: result.data.status || 'published', // Default to published if not provided
      createdBy: userId,
    })

    const populatedResource = await Resource.findById(resource._id).populate(
      'createdBy',
      'name email',
    )

    sendResponse(
      res,
      {
        resource: populatedResource,
      },
      'Resource created successfully',
      201,
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get all resources (Public - with search, filter, pagination)
 * GET /api/v1/resources
 */
export const getResources = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = getResourcesQuerySchema.safeParse(req.query)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { page, limit, category, tags, difficulty, search } = result.data

    // Build query
    const query: Record<string, unknown> = {}

    // For public routes, only show published resources
    // Admin routes can see all resources (this is handled by checking auth in admin endpoints)
    const authUser = (req as Request & { authUser?: { role?: string } }).authUser
    const isAdmin = authUser?.role === 'admin'

    // Build filters efficiently
    const filters: Record<string, unknown>[] = []

    // Status filter - only show published for non-admins
    if (!isAdmin) {
      filters.push({
        $or: [
          { status: 'published' },
          { status: { $exists: false } }, // Backward compatibility
        ],
      })
      filters.push({ status: { $ne: 'draft' } }) // Explicit exclusion
    }

    // Category filter
    if (category) {
      filters.push({ category: { $regex: category, $options: 'i' } })
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      filters.push({ tags: { $in: tagArray } })
    }

    // Difficulty filter
    if (difficulty) {
      filters.push({ difficulty })
    }

    // Search filter
    if (search) {
      filters.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ],
      })
    }

    // Combine filters
    if (filters.length > 0) {
      query.$and = filters
    } else if (!isAdmin) {
      // No other filters, but still need status filter
      query.$or = [{ status: 'published' }, { status: { $exists: false } }]
      query.status = { $ne: 'draft' }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Optimize: Run count and find in parallel
    const [total, resources] = await Promise.all([
      Resource.countDocuments(query),
      Resource.find(query)
        // Don't populate createdBy in list view - not needed and slows down query
        // Only populate in detail view where it's actually used
        .select('-__v') // Exclude version field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    // Query already filters drafts, no need to check again (performance optimization)
    const totalPages = Math.ceil(total / limit)

    sendResponse(
      res,
      {
        resources,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      'Resources retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get resource counts by category (Optimized for Home/Categories pages)
 * GET /api/v1/resources/counts
 */
export const getResourceCounts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { role?: string } }).authUser
    const isAdmin = authUser?.role === 'admin'

    // Build match query - only published for non-admins
    const matchConditions: Record<string, unknown>[] = [{ deletedAt: null }]

    if (!isAdmin) {
      matchConditions.push({
        $or: [{ status: 'published' }, { status: { $exists: false } }],
      })
      matchConditions.push({ status: { $ne: 'draft' } })
    }

    // Use aggregation pipeline for efficient counting by category
    const counts = await Resource.aggregate([
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $group: {
          _id: { $toLower: '$category' }, // Normalize to lowercase for matching
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
        },
      },
    ])

    // Convert to object for JSON serialization
    const countObject: Record<string, number> = {}
    counts.forEach((item) => {
      countObject[item.category] = item.count
    })

    sendResponse(
      res,
      {
        counts: countObject,
      },
      'Resource counts retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get resource by ID
 * GET /api/v1/resources/:id
 */
export const getResourceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError('Resource ID is required')
    }

    // Validate MongoDB ObjectId format to prevent 500 errors
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid resource ID format')
    }

    // Check if user is admin
    const authUser = (req as Request & { authUser?: { role?: string } }).authUser
    const isAdmin = authUser?.role === 'admin'

    // Build query - admins can see all, public users only see published
    const query: Record<string, unknown> = { _id: id }

    if (!isAdmin) {
      // Public users only see published resources (Active)
      // Explicitly exclude draft resources (Unactive)
      query.$and = [
        {
          $or: [
            { status: 'published' },
            { status: { $exists: false } }, // Old resources without status field
          ],
        },
        {
          status: { $ne: 'draft' }, // Explicitly exclude draft
        },
      ]
    }

    // Use try-catch around populate to handle reference errors gracefully
    let resource
    try {
      resource = await Resource.findOne(query).populate('createdBy', 'name email')
    } catch (dbError: unknown) {
      // Handle MongoDB errors (e.g., invalid ObjectId in populate)
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      logger.error('[getResourceById] Database error', { error: errorMessage, id })

      // Check if it's a CastError (invalid ObjectId in reference)
      if (dbError instanceof Error && dbError.name === 'CastError') {
        throw new ValidationError('Invalid resource reference')
      }

      // Re-throw as NotFoundError for other DB errors
      throw new NotFoundError('Resource not found')
    }

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    logger.debug('[getResourceById] Resource found', {
      title: resource.title,
      status: resource.status,
      isAdmin,
    })

    sendResponse(
      res,
      {
        resource,
      },
      'Resource retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Update resource (Admin only)
 * PATCH /api/v1/resources/:id
 */
export const updateResource = async (
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
      throw new ValidationError('Resource ID is required')
    }

    const result = updateResourceSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    logger.debug('[updateResource] Updating resource', { id, updateData: result.data })

    // Update the resource
    const resource = await Resource.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email')

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    // Verify the update was saved correctly by fetching fresh from DB
    const verifyResource = await Resource.findById(id).lean()
    logger.debug('[updateResource] Resource updated successfully', {
      id: resource._id,
      title: resource.title,
      status: resource.status,
      verifiedStatus: verifyResource?.status,
    })

    // Double-check: if status was updated, verify it's correct
    if (result.data.status && verifyResource?.status !== result.data.status) {
      logger.warn('[updateResource] WARNING: Status mismatch!', {
        requested: result.data.status,
        saved: verifyResource?.status,
        returned: resource.status,
      })
    }

    sendResponse(
      res,
      {
        resource,
      },
      'Resource updated successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Delete resource (Admin only - soft delete)
 * DELETE /api/v1/resources/:id
 */
export const deleteResource = async (
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
      throw new ValidationError('Resource ID is required')
    }

    // Soft delete
    const resource = await Resource.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    sendResponse(res, { success: true }, 'Resource deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Bookmark/unbookmark resource (Authenticated users)
 * POST /api/v1/resources/:id/bookmark
 */
export const toggleBookmark = async (
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
      throw new ValidationError('Resource ID is required')
    }

    // Check if resource exists
    const resource = await Resource.findById(id)
    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Check if already bookmarked
    const isBookmarked = user.bookmarkedResources.some((bookmarkId) => bookmarkId.toString() === id)

    if (isBookmarked) {
      // Remove bookmark
      user.bookmarkedResources = user.bookmarkedResources.filter(
        (bookmarkId) => bookmarkId.toString() !== id,
      )
      await user.save()

      sendResponse(res, { bookmarked: false }, 'Resource unbookmarked successfully')
    } else {
      // Add bookmark
      user.bookmarkedResources.push(resource._id)
      await user.save()

      sendResponse(res, { bookmarked: true }, 'Resource bookmarked successfully')
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get all bookmarked resources (Authenticated users)
 * GET /api/v1/resources/bookmarks/all
 */
export const getBookmarkedResources = async (
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

    // Get user with bookmarked resources
    const user = await User.findById(userId).populate({
      path: 'bookmarkedResources',
      populate: { path: 'createdBy', select: 'name email' },
    })

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Filter out deleted resources
    const bookmarkedResources = (user.bookmarkedResources as any[]).filter(
      (resource) => resource && !resource.deletedAt,
    )

    sendResponse(
      res,
      {
        resources: bookmarkedResources,
        count: bookmarkedResources.length,
      },
      'Bookmarked resources retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}
