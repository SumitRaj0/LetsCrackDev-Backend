import { logger } from './logger'
import nodemailer from 'nodemailer'

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

// Create reusable transporter
const createTransporter = () => {
  // Gmail SMTP configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'letscrackdev@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
    },
  })

  return transporter
}

/**
 * Send email using nodemailer
 */
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  const env = process.env.NODE_ENV || 'development'

  // In test environment, just log
  if (env === 'test') {
    logger.info('Email (mock) queued', { to, subject })
    logger.debug('Email (mock) content', { to, subject, html, text })
    return
  }

  // In development, log but don't send (unless GMAIL_APP_PASSWORD is set)
  if (env === 'development' && !process.env.GMAIL_APP_PASSWORD) {
    logger.info('Email (mock) queued', { to, subject })
    logger.debug('Email (mock) content', { to, subject, html, text })
    logger.info('Set GMAIL_APP_PASSWORD in .env to enable real email sending')
    return
  }

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"LetsCrackDev" <${process.env.GMAIL_USER || 'letscrackdev@gmail.com'}>`,
      to,
      subject,
      html: html || text,
      text: text || html,
    })

    logger.info('Email sent successfully', { to, subject })
  } catch (error: any) {
    logger.error('Failed to send email', { error: error.message, to, subject })
    throw new Error(`Failed to send email: ${error.message}`)
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
