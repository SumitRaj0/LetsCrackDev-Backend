/**
 * Integration Test Helpers
 * Utility functions for end-to-end integration tests
 */

import request from 'supertest'
import app from '../../app'
import mongoose from 'mongoose'
import { User } from '../../modules/auth/user.model'
import { Resource } from '../../modules/resources/resource.model'
import { Course } from '../../modules/courses/course.model'
import { Service } from '../../modules/services/service.model'
import { Purchase } from '../../modules/purchases/purchase.model'
import bcrypt from 'bcryptjs'

export interface TestUser {
  id: string
  email: string
  name: string
  accessToken: string
  refreshToken: string
  role: 'user' | 'admin'
}

/**
 * Create a test user and return auth tokens
 */
export async function createTestUser(
  email: string = `test.${Date.now()}@example.com`,
  password: string = 'Test@1234',
  name: string = 'Test User',
  role: 'user' | 'admin' = 'user',
): Promise<TestUser> {
  // Create user directly in DB
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name,
    role,
  })

  // Login to get tokens
  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200)

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name || name,
    accessToken: loginResponse.body.data.accessToken,
    refreshToken: loginResponse.body.data.refreshToken,
    role: user.role as 'user' | 'admin',
  }
}

/**
 * Create an authenticated request with token
 */
export function authenticatedRequest(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  token: string,
) {
  const req = request(app)
  return req[method](endpoint).set('Authorization', `Bearer ${token}`)
}

/**
 * Create a test resource
 */
export async function createTestResource(
  userId: string,
  overrides: Partial<{
    title: string
    description: string
    category: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    link: string
  }> = {},
): Promise<string> {
  const resource = await Resource.create({
    title: overrides.title || 'Test Resource',
    description: overrides.description || 'Test description',
    category: overrides.category || 'javascript',
    difficulty: overrides.difficulty || 'beginner',
    link: overrides.link || 'https://example.com/resource',
    tags: ['test'],
    createdBy: new mongoose.Types.ObjectId(userId),
  })

  return resource._id.toString()
}

/**
 * Create a test course
 */
export async function createTestCourse(
  userId: string,
  overrides: Partial<{
    title: string
    description: string
    category: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    price: number
  }> = {},
): Promise<string> {
  const course = await Course.create({
    title: overrides.title || 'Test Course',
    description: overrides.description || 'Test course description',
    category: overrides.category || 'Web Development',
    difficulty: overrides.difficulty || 'beginner',
    price: overrides.price || 99.99,
    createdBy: new mongoose.Types.ObjectId(userId),
    lessons: [
      {
        title: 'Lesson 1',
        content: 'Content 1',
        videoUrl: 'https://example.com/video1',
        duration: 10,
      },
    ],
  })

  return course._id.toString()
}

/**
 * Create a test service
 */
export async function createTestService(
  userId: string,
  overrides: Partial<{
    name: string
    description: string
    price: number
    category: string
    slug: string
  }> = {},
): Promise<string> {
  const service = await Service.create({
    name: overrides.name || 'Test Service',
    description: overrides.description || 'Test service description',
    price: overrides.price || 49.99,
    category: overrides.category || 'resume',
    slug: overrides.slug || `test-service-${Date.now()}`,
    createdBy: new mongoose.Types.ObjectId(userId),
  })

  return service._id.toString()
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(): Promise<void> {
  await User.deleteMany({})
  await Resource.deleteMany({})
  await Course.deleteMany({})
  await Service.deleteMany({})
  await Purchase.deleteMany({})
}

/**
 * Wait for a specified time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate unique email for tests
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).substring(7)}@example.com`
}
