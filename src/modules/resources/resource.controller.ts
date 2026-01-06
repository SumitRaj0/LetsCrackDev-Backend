import { Request, Response, NextFunction } from 'express'
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

    // Build conditions array for proper MongoDB query construction
    const conditions: Record<string, unknown>[] = []

    // Always filter out draft resources for non-admin users
    if (!isAdmin) {
      // Public users only see published resources (Active)
      // Draft resources (Unactive) are automatically excluded by this condition
      // Also include resources without status field (backward compatibility - treat as published)
      conditions.push({
        $or: [
          { status: 'published' },
          { status: { $exists: false } }, // Old resources without status field
        ],
      })
    }
    // Admins see all resources (no status filter)

    // Add other filters
    if (category) {
      conditions.push({ category: { $regex: category, $options: 'i' } })
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      conditions.push({ tags: { $in: tagArray } })
    }

    if (difficulty) {
      conditions.push({ difficulty })
    }

    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ],
      })
    }

    // Combine all conditions
    if (conditions.length === 0) {
      // No filters - empty query (will match all for admin, or use default status filter)
      if (!isAdmin) {
        query.$or = [{ status: 'published' }, { status: { $exists: false } }]
      }
    } else if (conditions.length === 1) {
      // Single condition - merge directly
      Object.assign(query, conditions[0])
    } else {
      // Multiple conditions - use $and
      query.$and = conditions
    }

    // For public users, ensure we NEVER return draft resources
    // Add explicit exclusion as a safety measure (MongoDB will combine this correctly)
    if (!isAdmin && query.$and && Array.isArray(query.$and)) {
      // If we have $and conditions, add draft exclusion to the $and array
      query.$and.push({ status: { $ne: 'draft' } })
    } else if (!isAdmin && !query.$and) {
      // If no $and, we can add it at root level
      // But first check if query already has status conditions
      if (query.$or) {
        // We have $or for status, add draft exclusion separately
        query.status = { $ne: 'draft' }
      } else {
        // No status condition yet, add it
        query.status = { $ne: 'draft' }
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const total = await Resource.countDocuments(query)

    // Get resources
    const resources = await Resource.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // CRITICAL: Verify no draft resources are returned for public users
    if (!isAdmin) {
      const draftResources = resources.filter((r) => {
        const status = r.status
        // Only check for valid status values from the type definition
        return status === 'draft'
      })
      if (draftResources.length > 0) {
        logger.error(
          '[getResources] ERROR: Draft/Unactive resources found in public response!',
          undefined,
          draftResources.map((r) => ({
            id: r._id,
            title: r.title,
            status: r.status,
            rawStatus: JSON.stringify(r.status),
          })),
        )
        // Filter them out as a safety measure
        const filteredResources = resources.filter((r) => {
          const status = r.status
          return status === 'published' || status === undefined || status === null
        })
        return sendResponse(
          res,
          {
            resources: filteredResources,
            pagination: {
              page,
              limit,
              total: filteredResources.length,
              totalPages: Math.ceil(filteredResources.length / limit),
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
          'Resources retrieved successfully',
        )
      }
    }

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

    const resource = await Resource.findOne(query).populate('createdBy', 'name email')

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
