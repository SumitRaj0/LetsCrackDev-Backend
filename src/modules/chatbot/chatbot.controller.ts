/**
 * Chatbot Controller
 * Handles AI chatbot interactions using Google Gemini
 */

import { Request, Response, NextFunction } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ValidationError, InternalServerError, BadRequestError } from '../../utils/errors'
import { sendResponse } from '../../utils/response'
import { logger } from '../../utils/logger'

const SYSTEM_PROMPT = `You are DevHub AI, a friendly senior software engineer assistant. Your role is to help developers with:

- JavaScript, React, Next.js, Node.js
- Data Structures and Algorithms (DSA)
- Interview preparation
- Code debugging and best practices
- Career advice for developers

Keep your responses:
- Short, clear, and beginner-friendly
- Practical with code examples when helpful
- Encouraging and supportive
- Focused on helping developers learn and grow

Always be professional, friendly, and ready to help!`

/**
 * Send message to AI chatbot
 * POST /api/v1/chatbot/chat
 */
export const sendChatMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get validated data from middleware (already validated by validate middleware)
    const validatedData = (req as any).validated?.body || req.body
    const { message, history = [] } = validatedData

    logger.info('Chat request received', {
      messageLength: message?.length,
      historyLength: history?.length,
    })

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
      logger.error('Gemini API key is not configured')
      throw new InternalServerError(
        'Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.',
      )
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey)

    // Use a currently supported Gemini chat model
    // Try gemini-1.5-flash if gemini-2.0-flash has quota issues
    const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    logger.info(`Using Gemini model ID: ${modelId}`)

    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    // Build conversation history - CRITICAL: Must start with 'user' role
    let chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = []

    if (Array.isArray(history) && history.length > 0) {
      chatHistory = history
        .filter((msg) => {
          // Only include messages with valid role and content
          if (!msg || !msg.role || !msg.content) return false
          const role = msg.role.toLowerCase()
          return (
            (role === 'user' || role === 'assistant') &&
            typeof msg.content === 'string' &&
            msg.content.trim() !== ''
          )
        })
        .slice(-20) // Keep last 20 messages to avoid token limits
        .map((msg) => ({
          role: msg.role.toLowerCase() === 'user' ? 'user' : 'model', // Convert 'assistant' to 'model'
          parts: [{ text: String(msg.content).trim() }],
        }))

      // CRITICAL: Ensure history starts with 'user' role (Gemini requirement)
      while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
        logger.warn('Removing invalid leading message with role:', chatHistory[0].role)
        chatHistory = chatHistory.slice(1)
      }
    }

    // Build chat configuration
    const chatConfig: { history?: typeof chatHistory } = {}

    // Only add history if it exists, starts with 'user', and is valid
    if (chatHistory.length > 0) {
      if (chatHistory[0].role === 'user') {
        chatConfig.history = chatHistory
        logger.info('Added history to chat config')
      } else {
        logger.error('ERROR: History does not start with user role!')
        // Don't add invalid history - start fresh
      }
    }

    // Start chat session
    const chat = model.startChat(chatConfig)

    // Send the current user message
    logger.info('Sending message to Gemini')
    const result = await chat.sendMessage(message.trim())
    const response = await result.response
    const text = response.text()
    logger.info('Received response from Gemini')

    sendResponse(
      res,
      {
        reply: text,
      },
      'Message processed successfully',
    )
  } catch (error) {
    // Log the full error for debugging
    logger.error('Chat API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })

    // Handle specific Gemini API errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      const errorName = error.name.toLowerCase()

      // Check for API key errors
      if (
        errorMessage.includes('api key') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('authentication') ||
        errorName.includes('auth')
      ) {
        return next(
          new ValidationError(
            'Invalid API key. Please check your GEMINI_API_KEY environment variable.',
          ),
        )
      }

      // Check for rate limit / quota errors
      if (
        errorMessage.includes('quota') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('rate_limit') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('free_tier')
      ) {
        // Check if it's a quota exhaustion (limit: 0) vs rate limit
        const isQuotaExhausted =
          errorMessage.includes('limit: 0') || errorMessage.includes('free_tier_requests')

        if (isQuotaExhausted) {
          // Quota exhausted - more serious error
          const quotaError = new BadRequestError(
            'AI service quota has been exhausted. The free tier has limited requests per day. Please try again later or upgrade your API plan.',
          )
          quotaError.statusCode = 429
          return next(quotaError)
        } else {
          // Regular rate limit - temporary
          const rateLimitError = new BadRequestError(
            'Rate limit exceeded. Please wait a moment and try again.',
          )
          rateLimitError.statusCode = 429
          return next(rateLimitError)
        }
      }

      // Check for model not found errors
      if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        return next(
          new BadRequestError(
            'The specified AI model is not available. Please check your GEMINI_MODEL configuration.',
          ),
        )
      }
    }

    // If error is already an AppError, pass it through
    if (
      error instanceof ValidationError ||
      error instanceof InternalServerError ||
      error instanceof BadRequestError
    ) {
      return next(error)
    }

    // For unknown errors, wrap them
    logger.error('Unknown error in chatbot:', error)
    next(
      new InternalServerError(
        error instanceof Error ? error.message : 'An error occurred while processing your request.',
      ),
    )
  }
}
