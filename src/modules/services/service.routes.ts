import { Router } from 'express'
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from './service.controller'
import { requireAuth, requireAdmin } from '../auth/auth.middleware'
import { validate } from '../../middleware/validation'
import { createServiceSchema, updateServiceSchema, getServicesQuerySchema } from './service.schema'

const router = Router()

// Public routes
router.get('/', validate(getServicesQuerySchema, { location: 'query' }), getServices)
router.get('/:idOrSlug', getServiceById)

// Admin-only routes
router.post('/', requireAuth, requireAdmin, validate(createServiceSchema), createService)
router.patch('/:id', requireAuth, requireAdmin, validate(updateServiceSchema), updateService)
router.put('/:id', requireAuth, requireAdmin, validate(updateServiceSchema), updateService)
router.delete('/:id', requireAuth, requireAdmin, deleteService)

export default router

