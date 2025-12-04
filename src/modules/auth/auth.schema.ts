import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  avatar: z.string().url().optional(),
})

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(5).max(20).optional(),
  avatar: z.string().url().optional(),
  password: z.string().min(8).max(128).optional(),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>


