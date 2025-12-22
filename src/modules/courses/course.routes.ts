import { Router } from 'express'
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from './course.controller'
import { requireAuth, requireAdmin } from '../auth/auth.middleware'
import { validate } from '../../middleware/validation'
import { createCourseSchema, updateCourseSchema, getCoursesQuerySchema } from './course.schema'

const router = Router()

// Public routes
router.get('/', validate(getCoursesQuerySchema, { location: 'query' }), getCourses)
router.get('/:id', getCourseById)

// Admin-only routes
router.post('/', requireAuth, requireAdmin, validate(createCourseSchema), createCourse)
router.patch('/:id', requireAuth, requireAdmin, validate(updateCourseSchema), updateCourse)
router.put('/:id', requireAuth, requireAdmin, validate(updateCourseSchema), updateCourse)
router.delete('/:id', requireAuth, requireAdmin, deleteCourse)

export default router

