import { Router } from 'express'
import { validateCouponCode } from './coupon.controller'
import { apiLimiter } from '../../middleware/rateLimiter'

const router = Router()

/**
 * POST /api/v1/coupons/validate
 * Validate a coupon code
 * Public endpoint (but can use user context if authenticated)
 */
router.post('/validate', apiLimiter, validateCouponCode)

export default router
