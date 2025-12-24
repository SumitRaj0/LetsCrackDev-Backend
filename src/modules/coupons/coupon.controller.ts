/**
 * Coupon Controller
 * Handles coupon validation requests
 */

import { Request, Response, NextFunction } from 'express'
import { validateCouponSchema } from './coupon.schema'
import { validateCoupon } from './coupon.service'
import { sendResponse } from '../../utils/response'
import { ValidationError } from '../../utils/errors'

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

    if (validationResult.valid) {
      sendResponse(
        res,
        {
          valid: true,
          discount: validationResult.discount,
          finalAmount: validationResult.finalAmount,
          couponCode: validationResult.coupon?.code,
          message: validationResult.message,
        },
        'Coupon validated successfully',
      )
    } else {
      sendResponse(
        res,
        {
          valid: false,
          discount: 0,
          finalAmount: amount,
          message: validationResult.message,
        },
        validationResult.message,
        400,
      )
    }
  } catch (error) {
    next(error)
  }
}
