import mongoose, { Document, Schema } from 'mongoose'

export type UserRole = 'user' | 'admin'

export interface UserDocument extends Document {
  name: string
  email: string
  passwordHash: string
  avatar?: string
  phone?: string
  role: UserRole
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
  },
  { timestamps: true }
)

export const User = mongoose.model<UserDocument>('User', UserSchema)


