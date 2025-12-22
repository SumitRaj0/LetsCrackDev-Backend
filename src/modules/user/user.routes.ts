import { Router } from 'express'
import { getProfile, updateProfile, changePassword, deleteAccount } from './user.controller'
import { requireAuth } from '../auth/auth.middleware'
import { validate } from '../../middleware/validation'
import { updateProfileSchema, changePasswordSchema } from './user.schema'

const router = Router()

// All user routes require authentication
router.use(requireAuth)

// Get user profile
router.get('/profile', getProfile)

// Update user profile
router.put('/profile', validate(updateProfileSchema), updateProfile)
router.patch('/profile', validate(updateProfileSchema), updateProfile)

// Change password
router.put('/change-password', validate(changePasswordSchema), changePassword)

// Delete account (soft delete)
router.delete('/account', deleteAccount)

export default router

