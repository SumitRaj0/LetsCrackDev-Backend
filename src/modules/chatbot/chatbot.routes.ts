/**
 * Chatbot Routes
 * Handles AI chatbot endpoints
 */

import { Router } from 'express'
import { sendChatMessage } from './chatbot.controller'
import { requireAuth } from '../auth/auth.middleware'
import { validate } from '../../middleware/validation'
import { chatMessageSchema } from './chatbot.schema'
import { chatbotLimiter } from '../../middleware/rateLimiter'

const router = Router()

// Chat endpoint - requires authentication + user-specific rate limiting
router.post('/chat', requireAuth, chatbotLimiter, validate(chatMessageSchema), sendChatMessage)

export default router
