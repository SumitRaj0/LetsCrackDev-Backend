import { Request, Response } from 'express'
import { contactSchema } from './contact.schema'
import { sendContactEmail } from '../../utils/email'

export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = contactSchema.parse(req.body)

    // Send email to letscrackdev@gmail.com
    await sendContactEmail({
      fromName: validatedData.name,
      fromEmail: validatedData.email,
      subject: validatedData.subject,
      message: validatedData.message,
    })

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
      return
    }

    console.error('Contact form submission error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.',
    })
  }
}
