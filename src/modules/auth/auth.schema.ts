import { z } from 'zod'

// Enhanced password schema with complexity requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: passwordSchema,
  avatar: z.string().url().optional(),
})

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1, 'Password is required'), // Don't reveal min length on login
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(5).max(20).optional(),
  avatar: z.string().url().optional(),
  password: passwordSchema.optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>


