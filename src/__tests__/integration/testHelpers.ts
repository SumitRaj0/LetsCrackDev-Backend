/**
 * Test Helpers for Integration Tests
 * Provides utility functions for creating test data and making authenticated requests
 */

import request from 'supertest'
import app from '../../app'
import { User } from '../../modules/auth/user.model'
import { Service } from '../../modules/services/service.model'
import { Course } from '../../modules/courses/course.model'
import { Resource } from '../../modules/resources/resource.model'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  'test-access-token-secret-key-for-testing-only-min-32-chars-long'

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
}

/**
 * Create a test user and return access token and user ID
 */
export async function createTestUser(
  email: string,
  password: string,
  name: string,
  role: 'user' | 'admin' = 'user',
): Promise<{ accessToken: string; id: string; email: string }> {
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    email,
    passwordHash,
    name,
    role,
    isPremium: role === 'admin',
  })

  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  )

  return {
    accessToken,
    id: user._id.toString(),
    email: user.email,
  }
}

/**
 * Create a test service
 */
export async function createTestService(
  createdBy: string,
  data: {
    name: string
    price: number
    category: 'resume' | 'interview' | 'mentorship' | 'portfolio' | 'crash-course'
    slug: string
    description?: string
    deliverables?: string[]
    availability?: boolean
  },
): Promise<string> {
  const service = await Service.create({
    name: data.name,
    description: data.description || `Test description for ${data.name}`,
    price: data.price,
    category: data.category,
    slug: data.slug,
    deliverables: data.deliverables || ['Test deliverable'],
    availability: data.availability !== undefined ? data.availability : true,
    createdBy,
  })

  return service._id.toString()
}

/**
 * Create a test course
 */
export async function createTestCourse(
  createdBy: string,
  data: {
    title: string
    category: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    price: number
    description?: string
    thumbnail?: string
  },
): Promise<string> {
  const course = await Course.create({
    title: data.title,
    description: data.description || `Test description for ${data.title}`,
    category: data.category,
    difficulty: data.difficulty,
    price: data.price,
    thumbnail: data.thumbnail,
    createdBy,
  })

  return course._id.toString()
}

/**
 * Create a test resource
 */
export async function createTestResource(
  createdBy: string,
  data: {
    title: string
    category: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    description?: string
    url?: string
    status?: 'draft' | 'published'
  },
): Promise<string> {
  const resource = await Resource.create({
    title: data.title,
    description: data.description || `Test description for ${data.title}`,
    category: data.category,
    difficulty: data.difficulty,
    url: data.url || 'https://example.com/test-resource',
    status: data.status || 'published',
    createdBy,
  })

  return resource._id.toString()
}

/**
 * Make an authenticated request
 */
export function authenticatedRequest(
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,
  accessToken: string,
): request.Test {
  const req = request(app)[method](path).set('Authorization', `Bearer ${accessToken}`)
  return req
}

/**
 * Clean up test data (all collections)
 */
export async function cleanupTestData(): Promise<void> {
  const collections = [
    'users',
    'services',
    'courses',
    'resources',
    'purchases',
    'coupons',
    'interviewkitquestions',
  ]

  for (const collectionName of collections) {
    try {
      const collection = (await import('mongoose')).default.connection.collections[collectionName]
      if (collection) {
        await collection.deleteMany({})
      }
    } catch (error) {
      // Collection might not exist, ignore
    }
  }
}
