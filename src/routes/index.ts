/**
 * Routes Index
 * Clean starter router with no business logic.
 * You will add feature-specific routers here in later phases.
 */

import { Router } from 'express'
import authRoutes from '../modules/auth'
import userRoutes from '../modules/user'
import resourceRoutes from '../modules/resources'
import serviceRoutes from '../modules/services'
import courseRoutes from '../modules/courses'
import purchaseRoutes from '../modules/purchases'
import adminRoutes from '../modules/admin'
import chatbotRoutes from '../modules/chatbot'

const router = Router()

// Simple API info endpoint – no domain/business logic attached
router.get('/', (_req, res) => {
  res.json({
    name: 'LetsCrackDev API',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    timestamp: new Date().toISOString(),
    message:
      'Backend skeleton is ready. Auth module at /auth, User module at /user, Resources module at /resources, Services module at /services, Courses module at /courses.',
  })
})

// Auth module routes
router.use('/auth', authRoutes)

// User module routes
router.use('/user', userRoutes)

// Resources module routes
router.use('/resources', resourceRoutes)

// Services module routes
router.use('/services', serviceRoutes)

// Courses module routes
router.use('/courses', courseRoutes)

// Purchases module routes (webhook is handled separately in app.ts)
router.use('/purchases', purchaseRoutes)

// Admin module routes (requires admin authentication)
router.use('/admin', adminRoutes)

// Chatbot module routes (requires authentication)
router.use('/chatbot', chatbotRoutes)

export default router
