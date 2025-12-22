import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  price: z.number().min(0),
  category: z.enum(['resume', 'interview', 'mentorship', 'portfolio', 'crash-course']),
  slug: z
    .string()
    .min(3)
    .max(100)
    .toLowerCase()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  deliverables: z.array(z.string().min(1).max(200)).max(20).optional().default([]),
  availability: z.boolean().optional().default(true),
})

export const updateServiceSchema = z.object({
  name: z.string().min(3).max(200).trim().optional(),
  description: z.string().min(10).max(2000).trim().optional(),
  price: z.number().min(0).optional(),
  category: z.enum(['resume', 'interview', 'mentorship', 'portfolio', 'crash-course']).optional(),
  slug: z
    .string()
    .min(3)
    .max(100)
    .toLowerCase()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  deliverables: z.array(z.string().min(1).max(200)).max(20).optional(),
  availability: z.boolean().optional(),
})

export const getServicesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  category: z.enum(['resume', 'interview', 'mentorship', 'portfolio', 'crash-course']).optional(),
  availability: z.string().transform((val) => val === 'true').optional(),
  minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type GetServicesQueryInput = z.infer<typeof getServicesQuerySchema>

