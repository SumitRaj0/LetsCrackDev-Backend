import { Router } from 'express'
import {
  validateCouponCode,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} from './coupon.controller'
import { apiLimiter } from '../../middleware/rateLimiter'
import { requireAuth, requireAdmin } from '../auth/auth.middleware'

const router = Router()

/**
 * POST /api/v1/coupons/validate
 * Validate a coupon code
 * Public endpoint (but can use user context if authenticated)
 */
router.post('/validate', apiLimiter, validateCouponCode)

/**
 * Admin endpoints - require authentication and admin role
 */
router.use(requireAuth, requireAdmin)
router.post('/', createCoupon)
router.get('/', getAllCoupons)
router.put('/:id', updateCoupon)
router.delete('/:id', deleteCoupon)

export default router
