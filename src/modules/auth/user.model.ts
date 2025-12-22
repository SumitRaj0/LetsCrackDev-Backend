import mongoose, { Document, Schema } from 'mongoose'

export type UserRole = 'user' | 'admin'

export interface UserDocument extends Document {
  name: string
  email: string
  passwordHash: string
  avatar?: string
  phone?: string
  role: UserRole
  isPremium: boolean
  premiumExpiresAt?: Date
  razorpayCustomerId?: string
  passwordResetToken?: string
  passwordResetExpires?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    premiumExpiresAt: {
      type: Date,
    },
    razorpayCustomerId: {
      type: String,
      index: true,
      sparse: true,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// Soft delete: Exclude deleted users from queries by default
UserSchema.pre(/^find/, function (next) {
  // Only exclude deleted users if deletedAt is not explicitly queried
  const query = (this as mongoose.Query<unknown, UserDocument>).getQuery()
  if (query.deletedAt === undefined) {
    ;(this as mongoose.Query<unknown, UserDocument>).where({ deletedAt: null })
  }
  next()
})

export const User = mongoose.model<UserDocument>('User', UserSchema)


