/**
 * Admin Routes
 * All routes require admin authentication
 */

import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth/auth.middleware'
import { getAnalytics, getMonthlyStats, getSalesData, getUserStats } from './admin.controller'

const router = Router()

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin)

// Analytics endpoints
router.get('/analytics', getAnalytics)
router.get('/analytics/monthly', getMonthlyStats)
router.get('/analytics/sales', getSalesData)
router.get('/analytics/users', getUserStats)

export default router

