/**
 * Purchase Validation Schemas
 * Zod schemas for purchase-related endpoints
 */

import { z } from 'zod'

/**
 * Schema for creating a checkout session
 */
export const createCheckoutSchema = z.object({
  purchaseType: z.enum(['service', 'course']),
  serviceId: z.string().optional(),
  courseId: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  couponCode: z.string().optional(),
})

/**
 * Schema for querying purchases
 */
export const getPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  purchaseType: z.enum(['service', 'course']).optional(),
})

/**
 * Type exports
 */
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
export type GetPurchasesQueryInput = z.infer<typeof getPurchasesQuerySchema>
