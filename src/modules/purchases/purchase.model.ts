/**
 * Purchase Model
 * Tracks one-time purchases of services and courses
 */

import mongoose, { Document, Schema } from 'mongoose'

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PurchaseType = 'service' | 'course'

export interface PurchaseDocument extends Document {
  user: mongoose.Types.ObjectId
  purchaseType: PurchaseType
  serviceId?: mongoose.Types.ObjectId
  courseId?: mongoose.Types.ObjectId
  amount: number
  currency: string
  status: PurchaseStatus
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  razorpayCustomerId?: string
  couponCode?: string
  discountAmount?: number
  originalAmount: number
  metadata?: Record<string, string>
  completedAt?: Date
  refundedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PurchaseSchema = new Schema<PurchaseDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purchaseType: {
      type: String,
      enum: ['service', 'course'],
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    razorpayCustomerId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    completedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

// Indexes for common queries
PurchaseSchema.index({ user: 1, status: 1 })
PurchaseSchema.index({ user: 1, purchaseType: 1 })
PurchaseSchema.index({ createdAt: -1 })

export const Purchase = mongoose.model<PurchaseDocument>('Purchase', PurchaseSchema)
