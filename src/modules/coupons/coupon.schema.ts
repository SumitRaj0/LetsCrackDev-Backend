import { z } from 'zod'

/**
 * Schema for validating coupon code
 */
export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50, 'Coupon code is too long'),
  purchaseType: z.enum(['course', 'service'], {
    errorMap: () => ({ message: 'Purchase type must be either course or service' }),
  }),
  itemId: z.string().min(1, 'Item ID is required'),
  amount: z.number().min(0, 'Amount must be greater than or equal to 0'),
})

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>

/**
 * Schema for creating a coupon (admin only)
 */
export const createCouponSchema = z.object({
  code: z
    .string()
    .min(1, 'Coupon code is required')
    .max(50, 'Coupon code is too long')
    .toUpperCase(),
  discountType: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'Discount type must be either percentage or fixed' }),
  }),
  discountValue: z.number().min(0, 'Discount value must be greater than or equal to 0'),
  minPurchaseAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  validFrom: z.string().datetime().or(z.date()),
  validUntil: z.string().datetime().or(z.date()),
  usageLimit: z.number().min(1).optional(),
  userLimit: z.number().min(1).optional(),
  applicableTo: z.union([z.enum(['all', 'course', 'service']), z.array(z.string())]),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
