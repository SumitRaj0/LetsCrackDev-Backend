/**
 * Rate Limiter Configuration
 */

import rateLimit from 'express-rate-limit'

const isTestEnv = process.env.NODE_ENV === 'test'
const isDevEnv = process.env.NODE_ENV === 'development'

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) // 15 minutes default
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10) // Increased to 200

export const generalLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Completely disable rate limiting in test environment
    if (isTestEnv) return true
    // Skip rate limiting for webhook endpoints
    return req.path.includes('/webhook')
  },
})

/**
 * Authentication rate limiter
 *
 * - Much higher default max so multiple users behind the same IP can log in
 * - Disabled entirely in test and development environments
 * - Production limit can be tuned via AUTH_RATE_LIMIT_MAX env
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '200', 10), // 200 auth requests per IP per 15 min by default
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Disable auth rate limiting in tests and local development
  skip: () => isTestEnv || isDevEnv,
})

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Disable API rate limiting in tests to avoid flakiness
  skip: () => isTestEnv,
})

