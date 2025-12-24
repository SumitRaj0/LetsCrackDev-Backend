/**
 * Coupon Service
 * Business logic for coupon validation and discount calculation
 */

import { Coupon, CouponDocument } from './coupon.model'
import { Purchase } from '../purchases/purchase.model'

export interface ValidateCouponParams {
  code: string
  purchaseType: 'course' | 'service'
  itemId: string
  amount: number
  userId?: string
}

export interface CouponValidationResult {
  valid: boolean
  coupon?: CouponDocument
  discount: number
  finalAmount: number
  message: string
}

/**
 * Validate and apply coupon
 */
export async function validateCoupon(
  params: ValidateCouponParams,
): Promise<CouponValidationResult> {
  const { code, purchaseType, itemId, amount, userId } = params

  // Find coupon by code
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true })

  if (!coupon) {
    return {
      valid: false,
      discount: 0,
      finalAmount: amount,
      message: 'Invalid coupon code',
    }
  }

  // Check if coupon is within valid date range
  const now = new Date()
  if (now < coupon.validFrom || now > coupon.validUntil) {
    return {
      valid: false,
      discount: 0,
      finalAmount: amount,
      message: 'This coupon has expired or is not yet valid',
    }
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return {
      valid: false,
      discount: 0,
      finalAmount: amount,
      message: 'This coupon has reached its usage limit',
    }
  }

  // Check minimum purchase amount
  if (coupon.minPurchaseAmount && amount < coupon.minPurchaseAmount) {
    return {
      valid: false,
      discount: 0,
      finalAmount: amount,
      message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`,
    }
  }

  // Check if coupon is applicable to this purchase type
  if (coupon.applicableTo !== 'all') {
    if (Array.isArray(coupon.applicableTo)) {
      // If it's an array, check if itemId is in the list
      if (!coupon.applicableTo.includes(itemId)) {
        return {
          valid: false,
          discount: 0,
          finalAmount: amount,
          message: 'This coupon is not applicable to this item',
        }
      }
    } else {
      // If it's a string, check if it matches purchase type
      if (coupon.applicableTo !== purchaseType) {
        return {
          valid: false,
          discount: 0,
          finalAmount: amount,
          message: `This coupon is only valid for ${coupon.applicableTo} purchases`,
        }
      }
    }
  }

  // Check user limit (if user is provided)
  if (userId && coupon.userLimit) {
    const userUsageCount = await Purchase.countDocuments({
      user: userId,
      'metadata.couponCode': coupon.code,
      status: 'completed',
    })

    if (userUsageCount >= coupon.userLimit) {
      return {
        valid: false,
        discount: 0,
        finalAmount: amount,
        message: 'You have already used this coupon the maximum number of times',
      }
    }
  }

  // Calculate discount
  let discount = 0
  if (coupon.discountType === 'percentage') {
    discount = (amount * coupon.discountValue) / 100
    // Apply max discount cap if set
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount)
    }
  } else {
    // Fixed discount
    discount = coupon.discountValue
  }

  // Ensure discount doesn't exceed the purchase amount
  discount = Math.min(discount, amount)
  const finalAmount = Math.max(0, amount - discount)

  return {
    valid: true,
    coupon,
    discount: Math.round(discount * 100) / 100, // Round to 2 decimal places
    finalAmount: Math.round(finalAmount * 100) / 100,
    message: 'Coupon applied successfully',
  }
}

/**
 * Increment coupon usage count
 */
export async function incrementCouponUsage(couponId: string): Promise<void> {
  await Coupon.findByIdAndUpdate(couponId, {
    $inc: { usageCount: 1 },
  })
}
