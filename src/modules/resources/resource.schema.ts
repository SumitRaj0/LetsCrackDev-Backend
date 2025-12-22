import { z } from 'zod'

export const createResourceSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  category: z.string().min(2).max(100).trim(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional().default([]),
  link: z.string().url(),
  thumbnail: z.string().url().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
})

export const updateResourceSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().min(10).max(2000).trim().optional(),
  category: z.string().min(2).max(100).trim().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  link: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
})

export const getResourcesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  search: z.string().optional(),
})

export type CreateResourceInput = z.infer<typeof createResourceSchema>
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>
export type GetResourcesQueryInput = z.infer<typeof getResourcesQuerySchema>

