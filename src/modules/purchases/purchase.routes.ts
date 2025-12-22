/**
 * Purchase Routes
 * Handles purchase-related endpoints
 */

import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware'
import {
  createCheckoutSession,
  verifyPayment,
  getPurchaseStatus,
  getPurchases,
  getPurchaseById,
} from './purchase.controller'
import { validate } from '../../middleware/validation'
import { createCheckoutSchema, getPurchasesQuerySchema } from './purchase.schema'

const router = Router()

// Note: Webhook endpoint is handled in app.ts with raw body parsing
// This router only handles authenticated endpoints

/**
 * Create checkout session (Protected)
 * POST /api/v1/purchases/checkout
 */
router.post('/checkout', requireAuth, validate(createCheckoutSchema), createCheckoutSession)

/**
 * Verify payment (Protected)
 * POST /api/v1/purchases/verify
 */
router.post('/verify', requireAuth, verifyPayment)

/**
 * Get purchase status by order ID (Protected)
 * GET /api/v1/purchases/status/:orderId
 */
router.get('/status/:orderId', requireAuth, getPurchaseStatus)

/**
 * Get user's purchase history (Protected)
 * GET /api/v1/purchases
 */
router.get('/', requireAuth, validate(getPurchasesQuerySchema, { location: 'query' }), getPurchases)

/**
 * Get purchase by ID (Protected)
 * GET /api/v1/purchases/:id
 */
router.get('/:id', requireAuth, getPurchaseById)

export default router

