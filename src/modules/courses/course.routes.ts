import { Router } from 'express'
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getCourseEnrollment,
  updateCourseProgress,
} from './course.controller'
import { requireAuth, requireAdmin } from '../auth/auth.middleware'
import { validate } from '../../middleware/validation'
import { createCourseSchema, updateCourseSchema, getCoursesQuerySchema } from './course.schema'

const router = Router()

// Public routes
router.get('/', validate(getCoursesQuerySchema, { location: 'query' }), getCourses)
router.get('/:id', getCourseById)

// Authenticated user routes (enrollment and progress)
router.post('/:id/enroll', requireAuth, enrollInCourse)
router.get('/:id/enrollment', requireAuth, getCourseEnrollment)
router.patch('/:id/progress', requireAuth, updateCourseProgress)

// Admin-only routes
router.post('/', requireAuth, requireAdmin, validate(createCourseSchema), createCourse)
router.patch('/:id', requireAuth, requireAdmin, validate(updateCourseSchema), updateCourse)
router.put('/:id', requireAuth, requireAdmin, validate(updateCourseSchema), updateCourse)
router.delete('/:id', requireAuth, requireAdmin, deleteCourse)

export default router
