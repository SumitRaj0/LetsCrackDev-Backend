/**
 * Service Controller Tests
 */

import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { Service } from '@/modules/services/service.model'
import { User } from '@/modules/auth/user.model'
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from '@/modules/services/service.controller'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'

jest.mock('../../../utils/response')

describe('Service Controller', () => {
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
    await Service.deleteMany({})
    await User.deleteMany({})
    jest.clearAllMocks()
  })

  describe('createService', () => {
    const validServiceData = {
      name: 'Test Service',
      description: 'This is a test service description that is long enough',
      price: 199.99,
      category: 'resume' as const,
      slug: 'test-service',
      deliverables: ['Resume Review', 'Cover Letter'],
      availability: true,
    }

    it('should create service successfully for admin', async () => {
      mockReq.body = validServiceData

      await createService(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          service: expect.objectContaining({
            name: 'Test Service',
            slug: 'test-service',
          }),
        }),
        'Service created successfully',
        201
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ConflictError when slug already exists', async () => {
      // Create a service with the same slug
      await Service.create({
        ...validServiceData,
        createdBy: adminUser._id,
      })

      mockReq.body = validServiceData

      await createService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError))
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.body = validServiceData

      await createService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.body = validServiceData

      await createService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.body = {
        name: 'AB', // Too short
        description: 'Short', // Too short
        slug: 'invalid slug!', // Invalid slug format
      }

      await createService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('getServices', () => {
    beforeEach(async () => {
      // Create test services
      await Service.create({
        name: 'Service One',
        description: 'Description for service one that is long enough',
        price: 100,
        category: 'resume',
        slug: 'service-one',
        createdBy: adminUser._id,
      })
      await Service.create({
        name: 'Service Two',
        description: 'Description for service two that is long enough',
        price: 200,
        category: 'interview',
        availability: false,
        slug: 'service-two',
        createdBy: adminUser._id,
      })
    })

    it('should get all services with default pagination', async () => {
      mockReq.query = {}

      await getServices(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          services: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
          }),
        }),
        'Services retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should filter services by category', async () => {
      mockReq.query = { category: 'resume' }

      await getServices(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const services = callArgs[1].services
      expect(services.every((s: any) => s.category === 'resume')).toBe(true)
    })

    it('should filter services by availability', async () => {
      mockReq.query = { availability: 'true' }

      await getServices(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const services = callArgs[1].services
      expect(services.every((s: any) => s.availability === true)).toBe(true)
    })

    it('should filter services by price range', async () => {
      mockReq.query = { minPrice: '150', maxPrice: '250' }

      await getServices(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      const services = callArgs[1].services
      expect(services.every((s: any) => s.price >= 150 && s.price <= 250)).toBe(true)
    })

    it('should handle pagination correctly', async () => {
      mockReq.query = { page: '1', limit: '1' }

      await getServices(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalled()
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      expect(callArgs[1].pagination.page).toBe(1)
      expect(callArgs[1].pagination.limit).toBe(1)
      expect(callArgs[1].services.length).toBe(1)
    })
  })

  describe('getServiceById', () => {
    let testService: any

    beforeEach(async () => {
      testService = await Service.create({
        name: 'Test Service',
        description: 'Test description that is long enough for validation',
        price: 150,
        category: 'resume',
        slug: 'test-service',
        createdBy: adminUser._id,
      })
    })

    it('should get service by ID successfully', async () => {
      mockReq.params = { idOrSlug: testService._id.toString() }

      await getServiceById(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          service: expect.objectContaining({
            name: 'Test Service',
          }),
        }),
        'Service retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should get service by slug successfully', async () => {
      mockReq.params = { idOrSlug: 'test-service' }

      await getServiceById(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          service: expect.objectContaining({
            slug: 'test-service',
          }),
        }),
        'Service retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ValidationError when idOrSlug is missing', async () => {
      mockReq.params = {}

      await getServiceById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should throw NotFoundError when service does not exist', async () => {
      mockReq.params = { idOrSlug: 'non-existent-slug' }

      await getServiceById(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })

  describe('updateService', () => {
    let testService: any

    beforeEach(async () => {
      testService = await Service.create({
        name: 'Original Service',
        description: 'Original description that is long enough for validation',
        price: 100,
        category: 'resume',
        slug: 'original-service',
        createdBy: adminUser._id,
      })
    })

    it('should update service successfully for admin', async () => {
      mockReq.params = { id: testService._id.toString() }
      mockReq.body = {
        name: 'Updated Service',
        price: 150,
      }

      await updateService(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          service: expect.objectContaining({
            name: 'Updated Service',
            price: 150,
          }),
        }),
        'Service updated successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ConflictError when updating to existing slug', async () => {
      // Create another service with different slug
      await Service.create({
        name: 'Other Service',
        description: 'Other description that is long enough',
        price: 200,
        category: 'interview',
        slug: 'other-service',
        createdBy: adminUser._id,
      })

      mockReq.params = { id: testService._id.toString() }
      mockReq.body = {
        slug: 'other-service', // This slug already exists
      }

      await updateService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError))
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testService._id.toString() }
      mockReq.body = { name: 'Updated' }

      await updateService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.params = { id: testService._id.toString() }
      mockReq.body = { name: 'Updated' }

      await updateService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw NotFoundError when service does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }
      mockReq.body = { name: 'Updated' }

      await updateService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })

    it('should throw ValidationError for invalid input', async () => {
      mockReq.params = { id: testService._id.toString() }
      mockReq.body = {
        name: 'AB', // Too short
        slug: 'invalid slug!', // Invalid slug format
      }

      await updateService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('deleteService', () => {
    let testService: any

    beforeEach(async () => {
      testService = await Service.create({
        name: 'Service to Delete',
        description: 'Description that is long enough for validation',
        price: 100,
        category: 'resume',
        slug: 'service-to-delete',
        createdBy: adminUser._id,
      })
    })

    it('should soft delete service successfully for admin', async () => {
      mockReq.params = { id: testService._id.toString() }

      await deleteService(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        { success: true },
        'Service deleted successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()

      // Verify soft delete - service should not be found in normal queries
      const normalQuery = await Service.findById(testService._id)
      expect(normalQuery).toBeNull() // Should be null due to soft delete pre-find hook
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined
      mockReq.params = { id: testService._id.toString() }

      await deleteService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'
      mockReq.params = { id: testService._id.toString() }

      await deleteService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })

    it('should throw NotFoundError when service does not exist', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() }

      await deleteService(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError))
    })
  })
})
