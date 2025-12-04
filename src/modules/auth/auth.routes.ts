import { Router } from 'express'
import { signup, login, refreshToken, getMe, updateMe, deleteMe } from './auth.controller'
import { requireAuth, requireAdmin } from './auth.middleware'

const router = Router()

// Public auth routes
router.post('/signup', signup)
router.post('/login', login)
router.post('/refresh-token', refreshToken)

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


