import mongoose, { Document, Schema } from 'mongoose'

export type ServiceCategory = 'resume' | 'interview' | 'mentorship' | 'portfolio' | 'crash-course'

export interface ServiceDocument extends Document {
  name: string
  description: string
  price: number
  category: ServiceCategory
  slug: string
  deliverables: string[]
  availability: boolean
  createdBy: mongoose.Types.ObjectId
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ServiceSchema = new Schema<ServiceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['resume', 'interview', 'mentorship', 'portfolio', 'crash-course'],
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    deliverables: {
      type: [String],
      default: [],
      validate: {
        validator: (deliverables: string[]) => deliverables.length <= 20,
        message: 'Maximum 20 deliverables allowed',
      },
    },
    availability: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// Soft delete: Exclude deleted services from queries by default
ServiceSchema.pre(/^find/, function (next) {
  const query = (this as mongoose.Query<unknown, ServiceDocument>).getQuery()
  if (query.deletedAt === undefined) {
    ;(this as mongoose.Query<unknown, ServiceDocument>).where({ deletedAt: null })
  }
  next()
})

// Indexes for better query performance
ServiceSchema.index({ category: 1 })
ServiceSchema.index({ slug: 1 }, { unique: true })
ServiceSchema.index({ availability: 1 })
ServiceSchema.index({ price: 1 })
ServiceSchema.index({ createdAt: -1 })

export const Service = mongoose.model<ServiceDocument>('Service', ServiceSchema)

