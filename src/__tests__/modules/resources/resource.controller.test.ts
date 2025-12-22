/**
 * Resource Controller Tests
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { Resource } from '@/modules/resources/resource.model'
import { User } from '@/modules/auth/user.model'
import {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
} from '@/modules/resources/resource.controller'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'

jest.mock('../../../utils/response')

describe('Resource Controller', () => {
  let mockReq: Partial<Request & { authUser?: { sub?: string; role?: string } }>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let adminUser: any

  beforeEach(async () => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      authUser: { sub: '', role: 'admin' },
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: 'admin',
    })
    mockReq.authUser!.sub = adminUser._id.toString()
  })

  afterEach(async () => {
    await Resource.deleteMany({})
    await User.deleteMany({})
    jest.clearAllMocks()
  })

  describe('createResource', () => {
    const validResourceData = {
      title: 'Test Resource',
      description: 'This is a test resource description that is long enough',
      category: 'Web Development',
      tags: ['react', 'javascript'],
      link: 'https://example.com/resource',
      thumbnail: 'https://example.com/thumb.jpg',
      difficulty: 'beginner' as const,
    }

    it('should create resource successfully for admin', async () => {
      mockReq.body = validResourceData

      await createResource(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          resource: expect.objectContaining({
            title: 'Test Resource',
            category: 'Web Development',
          }),
        }),
        'Resource created successfully',
        201
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.body = validResourceData

      await createResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.body = validResourceData

      await createResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.body = {
        title: 'AB', // Too short
        description: 'Short', // Too short
        link: 'invalid-url', // Invalid URL
      }

      await createResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('getResources', () => {
    beforeEach(async () => {
      // Create test resources
      await Resource.create({
        title: 'Resource One',
        description: 'Description for resource one that is long enough',
        category: 'Web Development',
        tags: ['react', 'javascript'],
        link: 'https://example.com/res1',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
      await Resource.create({
        title: 'Resource Two',
        description: 'Description for resource two that is long enough',
        category: 'Mobile Development',
        tags: ['react-native', 'mobile'],
        link: 'https://example.com/res2',
        difficulty: 'intermediate',
        createdBy: adminUser._id,
      })
    })

    it('should get all resources with default pagination', async () => {
      mockReq.query = {}

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          resources: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
          }),
        }),
        'Resources retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should filter resources by category', async () => {
      mockReq.query = { category: 'Web Development' }

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const resources = callArgs[1].resources
      expect(resources.every((r: any) => r.category === 'Web Development')).toBe(true)
    })

    it('should filter resources by tags', async () => {
      mockReq.query = { tags: 'react,javascript' }

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const resources = callArgs[1].resources
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should filter resources by difficulty', async () => {
      mockReq.query = { difficulty: 'intermediate' }

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const resources = callArgs[1].resources
      expect(resources.every((r: any) => r.difficulty === 'intermediate')).toBe(true)
    })

    it('should search resources by title, description, or tags', async () => {
      mockReq.query = { search: 'Mobile' }

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const resources = callArgs[1].resources
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should handle pagination correctly', async () => {
      mockReq.query = { page: '1', limit: '1' }

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      expect(callArgs[1].pagination.page).toBe(1)
      expect(callArgs[1].pagination.limit).toBe(1)
      expect(callArgs[1].resources.length).toBe(1)
    })

    it('should throw ValidationError for invalid query parameters', async () => {
      mockReq.query = { page: 'invalid', limit: 'abc' }

      await getResources(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('getResourceById', () => {
    let testResource: any

    beforeEach(async () => {
      testResource = await Resource.create({
        title: 'Test Resource',
        description: 'Test description that is long enough for validation',
        category: 'Web Development',
        tags: ['test'],
        link: 'https://example.com/test',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
    })

    it('should get resource by ID successfully', async () => {
      mockReq.params = { id: testResource._id.toString() }

      await getResourceById(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          resource: expect.objectContaining({
            title: 'Test Resource',
          }),
        }),
        'Resource retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ValidationError when ID is missing', async () => {
      mockReq.params = {}

      await getResourceById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when resource does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }

      await getResourceById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('updateResource', () => {
    let testResource: any

    beforeEach(async () => {
      testResource = await Resource.create({
        title: 'Original Title',
        description: 'Original description that is long enough for validation',
        category: 'Web Development',
        tags: ['original'],
        link: 'https://example.com/original',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
    })

    it('should update resource successfully for admin', async () => {
      mockReq.params = { id: testResource._id.toString() }
      mockReq.body = {
        title: 'Updated Title',
        category: 'Mobile Development',
      }

      await updateResource(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          resource: expect.objectContaining({
            title: 'Updated Title',
            category: 'Mobile Development',
          }),
        }),
        'Resource updated successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testResource._id.toString() }
      mockReq.body = { title: 'Updated' }

      await updateResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.params = { id: testResource._id.toString() }
      mockReq.body = { title: 'Updated' }

      await updateResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw NotFoundError when resource does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }
      mockReq.body = { title: 'Updated' }

      await updateResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.params = { id: testResource._id.toString() }
      mockReq.body = {
        title: 'AB', // Too short
        link: 'invalid-url', // Invalid URL
      }

      await updateResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('deleteResource', () => {
    let testResource: any

    beforeEach(async () => {
      testResource = await Resource.create({
        title: 'Resource to Delete',
        description: 'Description that is long enough for validation',
        category: 'Web Development',
        tags: ['test'],
        link: 'https://example.com/delete',
        difficulty: 'beginner',
        createdBy: adminUser._id,
      })
    })

    it('should soft delete resource successfully for admin', async () => {
      mockReq.params = { id: testResource._id.toString() }

      await deleteResource(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        { success: true },
        'Resource deleted successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()

      // Verify soft delete - resource should not be found in normal queries
      const normalQuery = await Resource.findById(testResource._id)
      expect(normalQuery).toBeNull() // Should be null due to soft delete pre-find hook
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testResource._id.toString() }

      await deleteResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.params = { id: testResource._id.toString() }

      await deleteResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw NotFoundError when resource does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }

      await deleteResource(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })
})
