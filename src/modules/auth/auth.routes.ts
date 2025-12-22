import { Router } from 'express'
import {
  signup,
  login,
  refreshToken,
  getMe,
  updateMe,
  deleteMe,
  forgotPassword,
  resetPassword,
} from './auth.controller'
import { requireAuth, requireAdmin } from './auth.middleware'
import { authLimiter } from '../../middleware/rateLimiter'
import { validate } from '../../middleware/validation'
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema'

const router = Router()

// Public auth routes - with rate limiting + validation to prevent brute force attacks
router.post('/signup', authLimiter, validate(signupSchema), signup)
router.post('/login', authLimiter, validate(loginSchema), login)
router.post('/refresh-token', authLimiter, validate(refreshTokenSchema), refreshToken)
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword)

// Authenticated user routes
router.get('/me', requireAuth, getMe)

// Update current user (PUT/PATCH)
router.put('/me', requireAuth, updateMe)
router.patch('/me', requireAuth, updateMe)

// Delete current user
router.delete('/me', requireAuth, deleteMe)

// Example admin-only route
router.get('/admin-only', requireAuth, requireAdmin, (_req, res) => {
  res.json({
    success: true,
    message: 'You are an admin',
  })
})

export default router


