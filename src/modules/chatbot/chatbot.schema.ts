import { z } from 'zod'

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000).trim(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>
