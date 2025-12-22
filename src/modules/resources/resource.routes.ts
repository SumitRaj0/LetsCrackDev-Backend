import { Router } from 'express'
import {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  toggleBookmark,
  getBookmarkedResources,
} from './resource.controller'
import { requireAuth, requireAdmin } from '../auth/auth.middleware'
import { validate } from '../../middleware/validation'
import {
  createResourceSchema,
  updateResourceSchema,
  getResourcesQuerySchema,
} from './resource.schema'

const router = Router()

// Public routes
router.get('/', validate(getResourcesQuerySchema, { location: 'query' }), getResources)
router.get('/:id', getResourceById)

// Authenticated user routes (bookmarks)
router.get('/bookmarks/all', requireAuth, getBookmarkedResources)
router.post('/:id/bookmark', requireAuth, toggleBookmark)

// Admin-only routes
router.post('/', requireAuth, requireAdmin, validate(createResourceSchema), createResource)
router.patch('/:id', requireAuth, requireAdmin, validate(updateResourceSchema), updateResource)
router.put('/:id', requireAuth, requireAdmin, validate(updateResourceSchema), updateResource)
router.delete('/:id', requireAuth, requireAdmin, deleteResource)

export default router
