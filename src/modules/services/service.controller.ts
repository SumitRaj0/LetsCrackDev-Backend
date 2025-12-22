import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { Service } from './service.model'
import { createServiceSchema, updateServiceSchema, getServicesQuerySchema } from './service.schema'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../utils/errors'
import { sendResponse } from '../../utils/response'

/**
 * Create service (Admin only)
 * POST /api/v1/services
 */
export const createService = async (
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

    const result = createServiceSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    // Check if slug already exists
    const existingService = await Service.findOne({ slug: result.data.slug })
    if (existingService) {
      throw new ConflictError('Service with this slug already exists')
    }

    const service = await Service.create({
      ...result.data,
      createdBy: userId,
    })

    const populatedService = await Service.findById(service._id).populate(
      'createdBy',
      'name email'
    )

    sendResponse(
      res,
      {
        service: populatedService,
      },
      'Service created successfully',
      201
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get all services (Public - with filters, pagination)
 * GET /api/v1/services
 */
export const getServices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = getServicesQuerySchema.safeParse(req.query)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { page, limit, category, availability, minPrice, maxPrice } = result.data

    // Build query
    const query: Record<string, unknown> = {}

    if (category) {
      query.category = category
    }

    if (availability !== undefined) {
      query.availability = availability
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

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const total = await Service.countDocuments(query)

    // Get services
    const services = await Service.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const totalPages = Math.ceil(total / limit)

    sendResponse(
      res,
      {
        services,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      'Services retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get service by ID or slug
 * GET /api/v1/services/:idOrSlug
 */
export const getServiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idOrSlug } = req.params

    if (!idOrSlug) {
      throw new ValidationError('Service ID or slug is required')
    }

    // Check if idOrSlug is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(idOrSlug)

    let service

    if (isValidObjectId) {
      // Try to find by ID first
      service = await Service.findOne({
        _id: idOrSlug,
        deletedAt: null,
      }).populate('createdBy', 'name email')
    }

    // If not found by ID or not a valid ObjectId, try by slug
    if (!service) {
      service = await Service.findOne({
        slug: idOrSlug,
        deletedAt: null,
      }).populate('createdBy', 'name email')
    }

    if (!service) {
      throw new NotFoundError('Service not found')
    }

    sendResponse(
      res,
      {
        service,
      },
      'Service retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Update service (Admin only)
 * PATCH /api/v1/services/:id
 */
export const updateService = async (
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
      throw new ValidationError('Service ID is required')
    }

    const result = updateServiceSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    // Check if slug is being updated and if it already exists
    if (result.data.slug) {
      const existingService = await Service.findOne({
        slug: result.data.slug,
        _id: { $ne: id },
      })
      if (existingService) {
        throw new ConflictError('Service with this slug already exists')
      }
    }

    const service = await Service.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email')

    if (!service) {
      throw new NotFoundError('Service not found')
    }

    sendResponse(
      res,
      {
        service,
      },
      'Service updated successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Delete service (Admin only - soft delete)
 * DELETE /api/v1/services/:id
 */
export const deleteService = async (
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
      throw new ValidationError('Service ID is required')
    }

    // Soft delete
    const service = await Service.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    )

    if (!service) {
      throw new NotFoundError('Service not found')
    }

    sendResponse(res, { success: true }, 'Service deleted successfully')
  } catch (error) {
    next(error)
  }
}

