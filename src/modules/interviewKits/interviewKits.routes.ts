import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware'
import { getInterviewKitQuestions } from './interviewKits.controller'

const router = Router()

/**
 * Interview Kits module routes
 * Mounted at /api/v1/interview-kits
 */
router.get('/:serviceId/questions', requireAuth, getInterviewKitQuestions)

export default router
