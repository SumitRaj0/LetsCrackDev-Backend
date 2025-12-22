/**
 * Razorpay Configuration
 * Initializes and exports Razorpay instance
 */

import Razorpay from 'razorpay'
import { logger } from '../utils/logger'

if (!process.env.RAZORPAY_KEY_ID) {
  logger.warn('⚠️  RAZORPAY_KEY_ID is not set. Razorpay features will be disabled.')
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  logger.warn('⚠️  RAZORPAY_KEY_SECRET is not set. Razorpay features will be disabled.')
}

if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
  logger.info('ℹ️  RAZORPAY_WEBHOOK_SECRET is not set. Webhook verification will be skipped (optional for local development).')
}

export const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null

export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''

// Razorpay configuration constants
export const RAZORPAY_CONFIG = {
  // Currency (INR for India)
  currency: 'INR',

  // Success/Cancel URLs (can be overridden per order)
  defaultSuccessUrl: process.env.RAZORPAY_SUCCESS_URL || 'http://localhost:5173/payment/success',
  defaultCancelUrl: process.env.RAZORPAY_CANCEL_URL || 'http://localhost:5173/payment/cancel',
}

