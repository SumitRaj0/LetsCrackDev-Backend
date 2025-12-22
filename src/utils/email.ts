import { logger } from './logger'

export interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

/**
 * Lightweight email sending utility.
 *
 * In development and test environments, this will log the email contents
 * instead of attempting to send a real email. In production, you can
 * wire this up to a real provider (SendGrid, SES, etc.) while keeping
 * the same interface.
 */
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  const env = process.env.NODE_ENV || 'development'

  if (env === 'test' || env === 'development') {
    logger.info('Email (mock) queued', { to, subject })
    logger.debug('Email (mock) content', { to, subject, html, text })
    return
  }

  // Placeholder for real production integration.
  // In a real setup, you would integrate with a provider here.
  logger.info('Email (placeholder) sent', { to, subject })
}


