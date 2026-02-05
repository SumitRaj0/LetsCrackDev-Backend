/**
 * Security Middleware
 */

import helmet from 'helmet'
import compression from 'compression'
import { Request, Response, NextFunction } from 'express'

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
  compression(),
]

export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin

  // Get allowed origins from environment variable or use defaults
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || []
  const allowedOrigins = [
    ...envOrigins,
    'https://letscrackdev.in',
    'https://www.letscrackdev.in',
    'https://letscrackdev.vercel.app',
    'https://lets-crack-dev-frontend.vercel.app',
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ]

  // Check if origin is localhost or Vercel
  const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))
  const isVercelApp = origin && /^https:\/\/[^/]*\.vercel\.app$/.test(origin)

  // Determine if origin should be allowed
  // Allow: explicit list, Vercel domains, or localhost (for development)
  let shouldAllowOrigin = false
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      shouldAllowOrigin = true
    } else if (isVercelApp) {
      // Allow all Vercel app domains (production)
      shouldAllowOrigin = true
    } else if (isLocalhost) {
      // Always allow localhost for local development
      shouldAllowOrigin = true
    }
  }

  // Set CORS headers - must be set for preflight requests to work
  if (shouldAllowOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }

  next()
}
