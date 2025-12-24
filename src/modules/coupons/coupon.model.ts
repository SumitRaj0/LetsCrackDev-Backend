/**
 * Coupon Model
 * Manages discount coupons for purchases
 */

import mongoose, { Document, Schema } from 'mongoose'

export type DiscountType = 'percentage' | 'fixed'
export type ApplicableTo = 'all' | 'course' | 'service'

export interface CouponDocument extends Document {
  code: string
  discountType: DiscountType
  discountValue: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  validFrom: Date
  validUntil: Date
  usageLimit?: number
  usageCount: number
  userLimit?: number
  applicableTo: ApplicableTo | string[]
  isActive: boolean
  description?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CouponSchema = new Schema<CouponDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userLimit: {
      type: Number,
      min: 1,
    },
    applicableTo: {
      type: Schema.Types.Mixed,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

// Indexes
CouponSchema.index({ code: 1, isActive: 1 })
CouponSchema.index({ validFrom: 1, validUntil: 1 })

export const Coupon = mongoose.model<CouponDocument>('Coupon', CouponSchema)
