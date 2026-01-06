import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { sendResponse } from '../../utils/response'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors'
import { Purchase } from '../purchases/purchase.model'
import { Service } from '../services/service.model'
import { InterviewKitQuestion } from './interviewKitQuestion.model'
import { logger } from '../../utils/logger'

/**
 * Simple in-memory cache for interview kit questions
 * Cache key: serviceId -> questions array
 * Cache TTL: 5 minutes (300000ms)
 */
interface CacheEntry {
  questions: any[]
  timestamp: number
}

const questionCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedQuestions(serviceId: string): any[] | null {
  const entry = questionCache.get(serviceId)
  if (!entry) return null

  const age = Date.now() - entry.timestamp
  if (age > CACHE_TTL) {
    questionCache.delete(serviceId)
    return null
  }

  return entry.questions
}

function setCachedQuestions(serviceId: string, questions: any[]): void {
  questionCache.set(serviceId, {
    questions,
    timestamp: Date.now(),
  })
}

/**
 * Transform DB document to frontend format
 */
function transformQuestion(doc: any) {
  return {
    id: doc.questionId,
    title: doc.title,
    coreConcept: doc.coreConcept,
    howItWorks: doc.howItWorks,
    interviewReadyAnswer: doc.interviewReadyAnswer,
    visualUnderstanding: doc.visualUnderstanding,
    interviewerLens: doc.interviewerLens,
    mistakes: doc.mistakes,
  }
}

/**
 * Get interview kit questions for a service (requires purchase access)
 * GET /api/v1/interview-kits/:serviceId/questions
 */
export const getInterviewKitQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { serviceId } = req.params

    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      throw new ValidationError('Invalid service ID')
    }

    const service = await Service.findById(serviceId)
    if (!service) {
      throw new NotFoundError('Service not found')
    }

    // Only support this kit for now
    if (service.slug !== 'javascript-interview-mastery-kit') {
      throw new NotFoundError('Interview kit not available for this service')
    }

    // Check purchase access
    const purchase = await Purchase.findOne({
      user: userId,
      purchaseType: 'service',
      serviceId: serviceId,
      status: 'completed',
    })

    if (!purchase) {
      throw new ForbiddenError('You do not have access to this interview kit')
    }

    // Check access expiry if present (same rules as purchase access links)
    if (purchase.metadata?.accessExpiresAt) {
      const expiresAt = new Date(purchase.metadata.accessExpiresAt)
      if (expiresAt < new Date()) {
        throw new BadRequestError('Access has expired')
      }
    }

    // Try cache first
    const cached = getCachedQuestions(serviceId)
    if (cached) {
      logger.debug('Interview kit cache hit', { serviceId })
      sendResponse(
        res,
        {
          kit: {
            serviceId: service._id.toString(),
            serviceName: service.name,
            questions: cached,
          },
        },
        'Interview kit questions retrieved successfully',
      )
      return
    }

    // Fetch from database
    const questions = await InterviewKitQuestion.find({ serviceId: service._id })
      .sort({ order: 1 })
      .lean()

    if (questions.length === 0) {
      logger.warn('No questions found in database for service', { serviceId })
      throw new NotFoundError('Interview kit questions not found. Please contact support.')
    }

    // Transform to frontend format
    const transformedQuestions = questions.map(transformQuestion)

    // Cache the result
    setCachedQuestions(serviceId, transformedQuestions)

    logger.info('Interview kit questions fetched from database', {
      serviceId,
      questionCount: transformedQuestions.length,
    })

    sendResponse(
      res,
      {
        kit: {
          serviceId: service._id.toString(),
          serviceName: service.name,
          questions: transformedQuestions,
        },
      },
      'Interview kit questions retrieved successfully',
    )
  } catch (error) {
    next(error)
  }
}
