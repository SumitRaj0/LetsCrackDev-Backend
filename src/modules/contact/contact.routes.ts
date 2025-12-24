import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { submitContactForm } from './contact.controller'

const router = Router()

// Contact form submission endpoint
// Rate limit: 5 requests per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many contact form submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/submit', contactLimiter, submitContactForm)

export default router
