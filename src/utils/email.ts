import { logger } from './logger'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import emailjs from '@emailjs/nodejs'

export interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export interface ContactEmailOptions {
  fromName: string
  fromEmail: string
  subject: string
  message: string
}

// Email provider type
type EmailProvider = 'emailjs' | 'resend' | 'sendgrid' | 'brevo' | 'mailgun' | 'gmail' | 'smtp'

/**
 * Get the email provider from environment variables
 * Priority: GMAIL_APP_PASSWORD (existing setup) > RESEND_API_KEY > EMAILJS > SENDGRID_API_KEY > BREVO_API_KEY > MAILGUN_API_KEY > SMTP
 */
const getEmailProvider = (): EmailProvider => {
  // Keep Gmail as priority if configured (user's existing setup)
  if (process.env.GMAIL_APP_PASSWORD) return 'gmail'
  // Check EmailJS if already configured
  if (
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  ) {
    return 'emailjs'
  }
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'
  if (process.env.BREVO_API_KEY) return 'brevo'
  if (process.env.MAILGUN_API_KEY) return 'mailgun'
  if (process.env.SMTP_HOST) return 'smtp'
  return 'gmail' // default fallback
}

/**
 * Send email using EmailJS (Same service you're already using for contact form!)
 * Free: 200 emails/month, then paid plans available
 */
const sendWithEmailJS = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (
    !process.env.EMAILJS_SERVICE_ID ||
    !process.env.EMAILJS_TEMPLATE_ID ||
    !process.env.EMAILJS_PUBLIC_KEY
  ) {
    throw new Error(
      'EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY must be configured',
    )
  }

  // Extract reset URL from HTML or text content
  const resetUrlMatch =
    html?.match(/href=["'](https?:\/\/[^"']+)["']/) || text?.match(/(https?:\/\/[^\s]+)/)
  const resetUrl = resetUrlMatch ? resetUrlMatch[1] : ''

  // Extract email name from email address
  const emailName = to.split('@')[0]

  // EmailJS requires template parameters
  // These parameter names should match your EmailJS template variables
  const templateParams: Record<string, string> = {
    to_email: to,
    to_name: emailName,
    user_email: to,
    email: to,
    subject: subject,
    message: text || html?.replace(/<[^>]*>/g, '') || '', // Plain text version
    html_message: html || text || '',
    // Password reset specific
    reset_url: resetUrl,
    reset_link: resetUrl,
    resetUrl: resetUrl,
    // Also include common variations
    password_reset_url: resetUrl,
    password_reset_link: resetUrl,
  }

  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    process.env.EMAILJS_TEMPLATE_ID,
    templateParams,
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY,
    },
  )
}

/**
 * Send email using Resend (Recommended - Free: 3,000 emails/month)
 */
const sendWithResend = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = process.env.RESEND_FROM_NAME || 'LetsCrackDev'

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject,
    html: html || text || '',
    text: text || html || '',
  })
}

/**
 * Send email using SendGrid SMTP (Free: 100 emails/day)
 */
const sendWithSendGrid = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
  })

  await transporter.sendMail({
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@letscrackdev.com',
    to,
    subject,
    html: html || text,
    text: text || html,
  })
}

/**
 * Send email using Brevo (formerly Sendinblue) (Free: 300 emails/day)
 */
const sendWithBrevo = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured')
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER || process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_API_KEY,
    },
  })

  await transporter.sendMail({
    from: process.env.BREVO_FROM_EMAIL || 'noreply@letscrackdev.com',
    to,
    subject,
    html: html || text,
    text: text || html,
  })
}

/**
 * Send email using Mailgun (Free: 5,000 emails/month for 3 months)
 */
const sendWithMailgun = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN must be configured')
  }

  const transporter = nodemailer.createTransport({
    host: `smtp.mailgun.org`,
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILGUN_SMTP_USER || `postmaster@${process.env.MAILGUN_DOMAIN}`,
      pass: process.env.MAILGUN_API_KEY,
    },
  })

  await transporter.sendMail({
    from: process.env.MAILGUN_FROM_EMAIL || `noreply@${process.env.MAILGUN_DOMAIN}`,
    to,
    subject,
    html: html || text,
    text: text || html,
  })
}

/**
 * Send email using Gmail SMTP with retry logic
 * Tries multiple connection strategies to work around Render's SMTP restrictions
 */
const sendWithGmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_APP_PASSWORD is not configured')
  }

  const gmailUser = process.env.GMAIL_USER || 'letscrackdev@gmail.com'
  let lastError: Error | null = null

  // Strategy 1: Try port 465 (SMTPS) - most reliable on cloud platforms
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL/TLS
      auth: {
        user: gmailUser,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 20000, // 20 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 30000, // 30 seconds
      // Don't use pooling on cloud (can cause stale connections)
      pool: false,
      tls: {
        rejectUnauthorized: true,
      },
    } as nodemailer.TransportOptions)

    const sendPromise = transporter.sendMail({
      from: `"LetsCrackDev" <${gmailUser}>`,
      to,
      subject,
      html: html || text,
      text: text || html,
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
    })

    await Promise.race([sendPromise, timeoutPromise])
    logger.info('Gmail email sent successfully via port 465', { to })
    return
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error(String(error))
    logger.warn('Failed to send via port 465, trying port 587', {
      error: lastError.message,
      to,
    })
  }

  // Strategy 2: Try port 587 (STARTTLS) as fallback
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: gmailUser,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 20000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      pool: false,
      requireTLS: true,
      tls: {
        rejectUnauthorized: true,
      },
    } as nodemailer.TransportOptions)

    const sendPromise = transporter.sendMail({
      from: `"LetsCrackDev" <${gmailUser}>`,
      to,
      subject,
      html: html || text,
      text: text || html,
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
    })

    await Promise.race([sendPromise, timeoutPromise])
    logger.info('Gmail email sent successfully via port 587', { to })
    return
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error(String(error))
    logger.warn('Failed to send via port 587, trying service method', {
      error: lastError.message,
      to,
    })
  }

  // Strategy 3: Try using 'service: gmail' as last resort
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 20000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      pool: false,
    } as nodemailer.TransportOptions)

    const sendPromise = transporter.sendMail({
      from: `"LetsCrackDev" <${gmailUser}>`,
      to,
      subject,
      html: html || text,
      text: text || html,
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
    })

    await Promise.race([sendPromise, timeoutPromise])
    logger.info('Gmail email sent successfully via service method', { to })
    return
  } catch (error: unknown) {
    lastError = error instanceof Error ? error : new Error(String(error))
    logger.error('All Gmail SMTP strategies failed', {
      error: lastError.message,
      to,
    })
  }

  // If all strategies fail, throw the last error
  throw new Error(
    `Failed to send email via Gmail SMTP: ${lastError?.message || 'Unknown error'}. ` +
      'This is likely due to Render blocking outbound SMTP connections. ' +
      'Check Render logs for more details. If issues persist, consider using Resend (HTTP API) as an alternative.',
  )
}

/**
 * Send email using custom SMTP
 */
const sendWithSMTP = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST is not configured')
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD || '',
        }
      : undefined,
    // Timeout configurations
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000, // 10 seconds
  })

  const sendPromise = transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@letscrackdev.com',
    to,
    subject,
    html: html || text,
    text: text || html,
  })

  // Race against timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
  })

  await Promise.race([sendPromise, timeoutPromise])
}

/**
 * Send email using the configured provider
 * Supports: Resend, SendGrid, Brevo, Mailgun, Gmail, or custom SMTP
 */
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  const env = process.env.NODE_ENV || 'development'

  // In test environment, just log
  if (env === 'test') {
    logger.info('Email (mock) queued', { to, subject })
    logger.debug('Email (mock) content', { to, subject, html, text })
    return
  }

  // Determine which email provider to use
  const provider = getEmailProvider()

  // Check if any email provider is configured
  const hasProvider =
    (process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      process.env.EMAILJS_PUBLIC_KEY) ||
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.BREVO_API_KEY ||
    process.env.MAILGUN_API_KEY ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_HOST

  if (!hasProvider) {
    const errorMsg =
      'No email provider configured. Please set one of: EMAILJS (EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY), RESEND_API_KEY, SENDGRID_API_KEY, BREVO_API_KEY, MAILGUN_API_KEY, GMAIL_APP_PASSWORD, or SMTP_HOST'
    if (env === 'development') {
      logger.warn(errorMsg, { to, subject })
      logger.warn('See FREE_EMAIL_SERVICES_GUIDE.md for setup instructions')
      logger.info('Email (mock) content', { to, subject, html, text })
    } else {
      logger.error(errorMsg, { to, subject, env })
    }
    // Always throw so controller can catch and handle (e.g., return reset URL in dev)
    throw new Error(errorMsg)
  }

  try {
    logger.info(`Sending email via ${provider}`, { to, subject, provider })

    // Create promises for email sending with timeout
    let sendPromise: Promise<void>

    // Send email using the selected provider
    switch (provider) {
      case 'emailjs':
        sendPromise = sendWithEmailJS({ to, subject, html, text })
        break
      case 'resend':
        sendPromise = sendWithResend({ to, subject, html, text })
        break
      case 'sendgrid':
        sendPromise = sendWithSendGrid({ to, subject, html, text })
        break
      case 'brevo':
        sendPromise = sendWithBrevo({ to, subject, html, text })
        break
      case 'mailgun':
        sendPromise = sendWithMailgun({ to, subject, html, text })
        break
      case 'gmail':
        sendPromise = sendWithGmail({ to, subject, html, text })
        break
      case 'smtp':
        sendPromise = sendWithSMTP({ to, subject, html, text })
        break
      default:
        throw new Error(`Unknown email provider: ${provider}`)
    }

    // Add overall timeout (20 seconds max)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Email send timeout after 20 seconds (provider: ${provider})`)),
        20000,
      )
    })

    await Promise.race([sendPromise, timeoutPromise])

    logger.info('Email sent successfully', { to, subject, provider })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: unknown }).code
        : undefined
    const errorResponse =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response: unknown }).response
        : undefined
    const errorStack = error instanceof Error ? error.stack : undefined
    const isTimeout = errorMessage.toLowerCase().includes('timeout')

    logger.error('Failed to send email', {
      error: errorMessage,
      to,
      subject,
      provider,
      errorCode,
      errorResponse,
      stack: errorStack,
      isTimeout,
    })

    // Throw with better context for timeout errors
    if (isTimeout) {
      throw new Error(
        `Email sending timed out after 20 seconds. Check ${provider} configuration and network.`,
      )
    }

    throw new Error(`Failed to send email via ${provider}: ${errorMessage}`)
  }
}

/**
 * Send contact form email to letscrackdev@gmail.com
 */
export const sendContactEmail = async ({
  fromName,
  fromEmail,
  subject,
  message,
}: ContactEmailOptions): Promise<void> => {
  const recipientEmail = process.env.CONTACT_EMAIL || 'letscrackdev@gmail.com'

  const emailSubject = `Contact Form: ${subject}`
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">New Contact Form Submission</h2>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; color: #374151;">${message}</p>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        This email was sent from the LetsCrackDev contact form.
      </p>
    </div>
  `

  const emailText = `
New Contact Form Submission

From: ${fromName} (${fromEmail})
Subject: ${subject}

Message:
${message}

---
This email was sent from the LetsCrackDev contact form.
  `

  await sendEmail({
    to: recipientEmail,
    subject: emailSubject,
    html: emailHtml,
    text: emailText,
  })
}
