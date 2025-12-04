/**
 * Routes Index
 * Clean starter router with no business logic.
 * You will add feature-specific routers here in later phases.
 */

import { Router } from 'express'
import authRoutes from '../modules/auth'

const router = Router()

// Simple API info endpoint – no domain/business logic attached
router.get('/', (_req, res) => {
  res.json({
    name: 'LetsCrackDev API',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    timestamp: new Date().toISOString(),
    message: 'Backend skeleton is ready. Auth module mounted at /auth.',
  })
})

// Auth module routes
router.use('/auth', authRoutes)

export default router

