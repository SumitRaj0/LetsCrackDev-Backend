import mongoose, { Document, Schema } from 'mongoose'

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Lesson {
  title: string
  description: string
  videoUrl: string
  freePreview: boolean
  duration?: number // in minutes
  order: number
}

export interface CourseDocument extends Document {
  title: string
  description: string
  thumbnail?: string
  lessons: Lesson[]
  price: number
  difficulty: CourseDifficulty
  category: string
  createdBy: mongoose.Types.ObjectId
  isPremium: boolean
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LessonSchema = new Schema<Lesson>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    videoUrl: {
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
        message: 'Video URL must be a valid URL',
      },
    },
    freePreview: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      min: 0,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
)

const CourseSchema = new Schema<CourseDocument>(
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
    lessons: {
      type: [LessonSchema],
      default: [],
      validate: {
        validator: (lessons: Lesson[]) => lessons.length <= 100,
        message: 'Maximum 100 lessons allowed',
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// Soft delete: Exclude deleted courses from queries by default
CourseSchema.pre(/^find/, function (next) {
  const query = (this as mongoose.Query<unknown, CourseDocument>).getQuery()
  if (query.deletedAt === undefined) {
    ;(this as mongoose.Query<unknown, CourseDocument>).where({ deletedAt: null })
  }
  next()
})

// Indexes for better query performance
CourseSchema.index({ category: 1 })
CourseSchema.index({ difficulty: 1 })
CourseSchema.index({ isPremium: 1 })
CourseSchema.index({ price: 1 })
CourseSchema.index({ createdAt: -1 })
CourseSchema.index({ title: 'text', description: 'text' }) // Text search index

export const Course = mongoose.model<CourseDocument>('Course', CourseSchema)

