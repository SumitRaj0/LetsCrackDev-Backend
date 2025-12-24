/**
 * Coupon Controller
 * Handles coupon validation requests and admin coupon management
 */

import { Request, Response, NextFunction } from 'express'
import { validateCouponSchema, createCouponSchema } from './coupon.schema'
import { validateCoupon } from './coupon.service'
import { Coupon } from './coupon.model'
import { sendResponse } from '../../utils/response'
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors'

/**
 * Validate coupon code
 * POST /api/v1/coupons/validate
 */
export const validateCouponCode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Validate input
    const result = validateCouponSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { code, purchaseType, itemId, amount } = result.data

    // Get user ID if authenticated
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    // Validate coupon
    const validationResult = await validateCoupon({
      code,
      purchaseType,
      itemId,
      amount,
      userId,
    })

    // Return 200 status for both valid and invalid coupons
    // The validation request itself succeeded, we just need to check data.valid
    sendResponse(
      res,
      {
        valid: validationResult.valid,
        discount: validationResult.discount,
        finalAmount: validationResult.finalAmount,
        couponCode: validationResult.coupon?.code,
        message: validationResult.message,
      },
      validationResult.valid ? 'Coupon validated successfully' : validationResult.message,
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Create a new coupon (admin only)
 * POST /api/v1/coupons
 */
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Validate input
    const result = createCouponSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new ValidationError('User ID is required')
    }

    const couponData = result.data

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: couponData.code.toUpperCase() })
    if (existingCoupon) {
      throw new ConflictError('Coupon code already exists')
    }

    // Convert date strings to Date objects if needed
    const validFrom =
      couponData.validFrom instanceof Date ? couponData.validFrom : new Date(couponData.validFrom)
    const validUntil =
      couponData.validUntil instanceof Date
        ? couponData.validUntil
        : new Date(couponData.validUntil)

    // Create coupon
    const coupon = new Coupon({
      ...couponData,
      code: couponData.code.toUpperCase(),
      validFrom,
      validUntil,
      createdBy: userId,
      usageCount: 0,
    })

    await coupon.save()

    sendResponse(
      res,
      {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minPurchaseAmount: coupon.minPurchaseAmount,
          maxDiscountAmount: coupon.maxDiscountAmount,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          usageLimit: coupon.usageLimit,
          usageCount: coupon.usageCount,
          userLimit: coupon.userLimit,
          applicableTo: coupon.applicableTo,
          isActive: coupon.isActive,
          description: coupon.description,
        },
      },
      'Coupon created successfully',
      201,
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get all coupons (admin only)
 * GET /api/v1/coupons
 */
export const getAllCoupons = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).populate('createdBy', 'name email')

    sendResponse(
      res,
      {
        coupons: coupons.map((coupon) => ({
          id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minPurchaseAmount: coupon.minPurchaseAmount,
          maxDiscountAmount: coupon.maxDiscountAmount,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          usageLimit: coupon.usageLimit,
          usageCount: coupon.usageCount,
          userLimit: coupon.userLimit,
          applicableTo: coupon.applicableTo,
          isActive: coupon.isActive,
          description: coupon.description,
          createdBy: coupon.createdBy,
          createdAt: coupon.createdAt,
          updatedAt: coupon.updatedAt,
        })),
      },
      'Coupons retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Update a coupon (admin only)
 * PUT /api/v1/coupons/:id
 */
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params

    // Validate input (make all fields optional for update)
    const updateSchema = createCouponSchema.partial()
    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const coupon = await Coupon.findById(id)
    if (!coupon) {
      throw new NotFoundError('Coupon')
    }

    const updateData: any = { ...result.data }

    // Convert date strings to Date objects if provided
    if (updateData.validFrom) {
      updateData.validFrom =
        updateData.validFrom instanceof Date ? updateData.validFrom : new Date(updateData.validFrom)
    }
    if (updateData.validUntil) {
      updateData.validUntil =
        updateData.validUntil instanceof Date
          ? updateData.validUntil
          : new Date(updateData.validUntil)
    }

    // If code is being updated, check for duplicates
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase()
      const existingCoupon = await Coupon.findOne({
        code: updateData.code,
        _id: { $ne: id },
      })
      if (existingCoupon) {
        throw new ConflictError('Coupon code already exists')
      }
    }

    Object.assign(coupon, updateData)
    await coupon.save()

    sendResponse(
      res,
      {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minPurchaseAmount: coupon.minPurchaseAmount,
          maxDiscountAmount: coupon.maxDiscountAmount,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          usageLimit: coupon.usageLimit,
          usageCount: coupon.usageCount,
          userLimit: coupon.userLimit,
          applicableTo: coupon.applicableTo,
          isActive: coupon.isActive,
          description: coupon.description,
        },
      },
      'Coupon updated successfully',
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Delete a coupon (admin only)
 * DELETE /api/v1/coupons/:id
 */
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params

    const coupon = await Coupon.findById(id)
    if (!coupon) {
      throw new NotFoundError('Coupon')
    }

    await Coupon.findByIdAndDelete(id)

    sendResponse(res, {}, 'Coupon deleted successfully')
  } catch (error) {
    next(error)
  }
}
