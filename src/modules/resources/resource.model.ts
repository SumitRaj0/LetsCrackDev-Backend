import mongoose, { Document, Schema } from 'mongoose'

export type ResourceDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ResourceDocument extends Document {
  title: string
  description: string
  category: string
  tags: string[]
  link: string
  thumbnail?: string
  difficulty: ResourceDifficulty
  createdBy: mongoose.Types.ObjectId
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ResourceSchema = new Schema<ResourceDocument>(
  {
    title: {
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
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 10,
        message: 'Maximum 10 tags allowed',
      },
    },
    link: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => {
          try {
            new URL(v)
            return true
          } catch {
            return false
          }
        },
        message: 'Link must be a valid URL',
      },
    },
    thumbnail: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true // Optional field
          try {
            new URL(v)
            return true
          } catch {
            return false
          }
        },
        message: 'Thumbnail must be a valid URL',
      },
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
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

// Soft delete: Exclude deleted resources from queries by default
ResourceSchema.pre(/^find/, function (next) {
  const query = (this as mongoose.Query<unknown, ResourceDocument>).getQuery()
  if (query.deletedAt === undefined) {
    ;(this as mongoose.Query<unknown, ResourceDocument>).where({ deletedAt: null })
  }
  next()
})

// Indexes for better query performance
ResourceSchema.index({ category: 1 })
ResourceSchema.index({ tags: 1 })
ResourceSchema.index({ difficulty: 1 })
ResourceSchema.index({ title: 'text', description: 'text' }) // Text search index
ResourceSchema.index({ createdAt: -1 })

export const Resource = mongoose.model<ResourceDocument>('Resource', ResourceSchema)

