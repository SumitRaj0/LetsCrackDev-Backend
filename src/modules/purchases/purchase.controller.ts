/**
 * Purchase Controller
 * Handles one-time payment purchases for services and courses using Razorpay
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { razorpay, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_CONFIG } from '../../config/razorpay'
import { Purchase } from './purchase.model'
import { Service } from '../services/service.model'
import { Course } from '../courses/course.model'
import { User } from '../auth/user.model'
import { createCheckoutSchema, getPurchasesQuerySchema } from './purchase.schema'
import { ValidationError, NotFoundError, UnauthorizedError, BadRequestError } from '../../utils/errors'
import { sendResponse } from '../../utils/response'
import { logger } from '../../utils/logger'

/**
 * Create Razorpay order for one-time purchase
 * POST /api/v1/purchases/checkout
 */
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; email?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    // Validate input
    const result = createCheckoutSchema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { purchaseType, serviceId, courseId, successUrl, cancelUrl } = result.data

    // Validate that either serviceId or courseId is provided based on purchaseType
    if (purchaseType === 'service' && !serviceId) {
      throw new ValidationError('serviceId is required for service purchases')
    }
    if (purchaseType === 'course' && !courseId) {
      throw new ValidationError('courseId is required for course purchases')
    }

    // Fetch the item being purchased
    let itemName = ''
    let itemDescription = ''
    let amount = 0

    if (purchaseType === 'service' && serviceId) {
      const service = await Service.findOne({ _id: serviceId, deletedAt: null })
      if (!service) {
        throw new NotFoundError('Service not found')
      }
      itemName = service.name
      itemDescription = service.description
      amount = service.price
    } else if (purchaseType === 'course' && courseId) {
      const course = await Course.findOne({ _id: courseId, deletedAt: null })
      if (!course) {
        throw new NotFoundError('Course not found')
      }
      itemName = course.title
      itemDescription = course.description
      amount = course.price
    }

    if (amount <= 0) {
      throw new BadRequestError('Item price must be greater than 0')
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Create purchase record (pending)
    const purchase = await Purchase.create({
      user: userId,
      purchaseType,
      serviceId: purchaseType === 'service' ? serviceId : undefined,
      courseId: purchaseType === 'course' ? courseId : undefined,
      amount,
      currency: RAZORPAY_CONFIG.currency,
      status: 'pending',
      metadata: {
        itemName,
        itemDescription,
        userId: userId,
      },
    })

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(amount * 100), // Convert to paise (smallest currency unit for INR)
      currency: RAZORPAY_CONFIG.currency,
      receipt: `purchase_${purchase._id.toString()}`,
      notes: {
        purchaseId: purchase._id.toString(),
        userId: userId,
        purchaseType,
        serviceId: serviceId || '',
        courseId: courseId || '',
        itemName,
      },
    }

    // In test/development environments Razorpay may not be configured.
    // To keep tests and local development smooth, fall back to a mock order
    // when the client is not available, while still using the real client
    // in production.
    type OrderShape = { id: string; amount: number; currency: string }
    let order: OrderShape
    if (razorpay) {
      const razorpayOrder = await razorpay.orders.create(orderOptions)
      order = {
        id: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
      }
    } else {
      logger.warn('Razorpay client not configured - using mock order for checkout session')
      order = {
        id: `order_mock_${purchase._id.toString()}`,
        amount: orderOptions.amount,
        currency: orderOptions.currency,
      }
    }

    // Update purchase with Razorpay order ID
    purchase.razorpayOrderId = order.id
    await purchase.save()

    sendResponse(
      res,
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay Checkout
        purchaseId: purchase._id.toString(),
        successUrl: successUrl || RAZORPAY_CONFIG.defaultSuccessUrl,
        cancelUrl: cancelUrl || RAZORPAY_CONFIG.defaultCancelUrl,
      },
      'Order created successfully',
      201
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Verify payment and update purchase status
 * POST /api/v1/purchases/verify
 */
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ValidationError('Missing payment verification data')
    }

    // Find purchase by order ID
    const purchase = await Purchase.findOne({
      razorpayOrderId: razorpay_order_id,
      user: userId,
    })

    if (!purchase) {
      throw new NotFoundError('Purchase not found')
    }

    if (purchase.status === 'completed') {
      throw new BadRequestError('Payment already verified')
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    // In test/local environments the secret may not be set; fall back to a stable
    // default so signature verification logic can still be exercised.
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test-secret'
    const generatedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex')

    if (generatedSignature !== razorpay_signature) {
      purchase.status = 'failed'
      await purchase.save()
      throw new BadRequestError('Invalid payment signature')
    }

    // Update purchase status
    purchase.status = 'completed'
    purchase.razorpayPaymentId = razorpay_payment_id
    purchase.razorpaySignature = razorpay_signature
    purchase.completedAt = new Date()
    await purchase.save()

    // Update user premium status if needed
    const user = await User.findById(userId)
    if (user) {
      if (purchase.purchaseType === 'course') {
        const course = await Course.findById(purchase.courseId)
        if (course && course.isPremium) {
          user.isPremium = true
          user.premiumExpiresAt = new Date()
          user.premiumExpiresAt.setFullYear(user.premiumExpiresAt.getFullYear() + 1)
          await user.save()
        }
      }
    }

    sendResponse(
      res,
      {
        purchase: purchase,
        verified: true,
      },
      'Payment verified successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get purchase status by order ID
 * GET /api/v1/purchases/status/:orderId
 */
export const getPurchaseStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { orderId } = req.params

    if (!orderId) {
      throw new ValidationError('Order ID is required')
    }

    const purchase = await Purchase.findOne({
      razorpayOrderId: orderId,
      user: userId,
    }).select('status razorpayOrderId amount currency')

    if (!purchase) {
      throw new NotFoundError('Purchase not found')
    }

    sendResponse(
      res,
      {
        orderId: purchase.razorpayOrderId,
        status: purchase.status,
        amount: purchase.amount,
        currency: purchase.currency,
      },
      'Purchase status retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Handle Razorpay webhook events
 * POST /api/v1/purchases/webhook
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string

  if (!webhookSignature) {
    return next(new BadRequestError('Missing webhook signature'))
  }

  // For Razorpay, we need the raw body for signature verification
  // But we've already parsed it in app.ts, so we'll verify with the parsed body
  const webhookBody = JSON.stringify(req.body)
  const secret = RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    logger.warn('RAZORPAY_WEBHOOK_SECRET not set, skipping signature verification')
  } else {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex')

    if (webhookSignature !== expectedSignature) {
      logger.error('Webhook signature verification failed')
      return next(new BadRequestError('Invalid webhook signature'))
    }
  }

  const event = req.body

  try {
    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity
        const orderId = payment.order_id

        const purchase = await Purchase.findOne({
          razorpayOrderId: orderId,
        })

        if (purchase && purchase.status === 'pending') {
          purchase.status = 'completed'
          purchase.razorpayPaymentId = payment.id
          purchase.completedAt = new Date()
          await purchase.save()

          // Update user premium status
          const user = await User.findById(purchase.user)
          if (user && purchase.purchaseType === 'course') {
            const course = await Course.findById(purchase.courseId)
            if (course && course.isPremium) {
              user.isPremium = true
              user.premiumExpiresAt = new Date()
              user.premiumExpiresAt.setFullYear(user.premiumExpiresAt.getFullYear() + 1)
              await user.save()
            }
          }

          logger.info(`Payment captured: ${purchase._id}`, {
            purchaseId: purchase._id,
            userId: purchase.user,
            amount: purchase.amount,
          })
        }
        break
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity
        const orderId = payment.order_id

        const purchase = await Purchase.findOne({
          razorpayOrderId: orderId,
        })

        if (purchase) {
          purchase.status = 'failed'
          await purchase.save()
        }
        break
      }

      case 'order.paid': {
        const order = event.payload.order.entity
        const purchase = await Purchase.findOne({
          razorpayOrderId: order.id,
        })

        if (purchase && purchase.status === 'pending') {
          purchase.status = 'completed'
          purchase.completedAt = new Date()
          await purchase.save()
        }
        break
      }

      default:
        logger.info(`Unhandled webhook event: ${event.event}`)
    }

    // Return 200 to acknowledge receipt
    res.status(200).json({ received: true })
  } catch (error) {
    logger.error('Error handling webhook event', error)
    next(error)
  }
}

/**
 * Get user's purchase history
 * GET /api/v1/purchases
 */
export const getPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    // Validate query parameters
    const result = getPurchasesQuerySchema.safeParse(req.query)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      throw new ValidationError(message)
    }

    const { page, limit, status, purchaseType } = result.data

    // Build query
    const query: Record<string, unknown> = { user: userId }
    if (status) {
      query.status = status
    }
    if (purchaseType) {
      query.purchaseType = purchaseType
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch purchases
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('serviceId', 'name slug price')
        .populate('courseId', 'title thumbnail price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Purchase.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limit)

    sendResponse(
      res,
      {
        purchases,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      'Purchases retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get single purchase by ID
 * GET /api/v1/purchases/:id
 */
export const getPurchaseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string } }).authUser
    const userId = authUser?.sub

    if (!userId) {
      throw new UnauthorizedError('Not authenticated')
    }

    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid purchase ID')
    }

    const purchase = await Purchase.findOne({
      _id: id,
      user: userId,
    })
      .populate('serviceId', 'name slug price description')
      .populate('courseId', 'title thumbnail price description')

    if (!purchase) {
      throw new NotFoundError('Purchase not found')
    }

    sendResponse(
      res,
      {
        purchase,
      },
      'Purchase retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}
