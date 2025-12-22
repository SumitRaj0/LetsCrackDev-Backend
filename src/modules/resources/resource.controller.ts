import { Request, Response, NextFunction } from 'express'
import { Resource } from './resource.model'
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

/**
 * Create resource (Admin only)
 * POST /api/v1/resources
 */
export const createResource = async (
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

    const result = createResourceSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const resource = await Resource.create({
      ...result.data,
      createdBy: userId,
    })

    const populatedResource = await Resource.findById(resource._id).populate(
      'createdBy',
      'name email'
    )

    sendResponse(
      res,
      {
        resource: populatedResource,
      },
      'Resource created successfully',
      201
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
  next: NextFunction
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

    if (category) {
      query.category = { $regex: category, $options: 'i' }
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      query.tags = { $in: tagArray }
    }

    if (difficulty) {
      query.difficulty = difficulty
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ]
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
      'Resources retrieved successfully'
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
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError('Resource ID is required')
    }

    const resource = await Resource.findById(id).populate('createdBy', 'name email')

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    sendResponse(
      res,
      {
        resource,
      },
      'Resource retrieved successfully'
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
      throw new ValidationError('Resource ID is required')
    }

    const result = updateResourceSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const resource = await Resource.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email')

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    sendResponse(
      res,
      {
        resource,
      },
      'Resource updated successfully'
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
      throw new ValidationError('Resource ID is required')
    }

    // Soft delete
    const resource = await Resource.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    )

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    sendResponse(res, { success: true }, 'Resource deleted successfully')
  } catch (error) {
    next(error)
  }
}

