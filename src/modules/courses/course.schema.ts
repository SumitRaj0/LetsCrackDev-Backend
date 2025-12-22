import { z } from 'zod'

export const lessonSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  videoUrl: z.string().url(),
  freePreview: z.boolean().optional().default(false),
  duration: z.number().min(0).optional(),
  order: z.number().min(0),
})

export const createCourseSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  thumbnail: z.string().url().optional(),
  lessons: z.array(lessonSchema).max(100).optional().default([]),
  price: z.number().min(0),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
  category: z.string().min(2).max(100).trim(),
  isPremium: z.boolean().optional().default(false),
})

export const updateCourseSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().min(10).max(2000).trim().optional(),
  thumbnail: z.string().url().optional(),
  lessons: z.array(lessonSchema).max(100).optional(),
  price: z.number().min(0).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  category: z.string().min(2).max(100).trim().optional(),
  isPremium: z.boolean().optional(),
})

export const getCoursesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  isPremium: z.string().transform((val) => val === 'true').optional(),
  minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type GetCoursesQueryInput = z.infer<typeof getCoursesQuerySchema>
export type LessonInput = z.infer<typeof lessonSchema>

