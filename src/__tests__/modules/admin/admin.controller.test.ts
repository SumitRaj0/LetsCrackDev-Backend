/**
 * Admin Controller Tests
 */

import { Request, Response, NextFunction } from 'express'
import { User } from '@/modules/auth/user.model'
import { Resource } from '@/modules/resources/resource.model'
import { Course } from '@/modules/courses/course.model'
import { Service } from '@/modules/services/service.model'
import { Purchase } from '@/modules/purchases/purchase.model'
import {
  getAnalytics,
  getMonthlyStats,
  getSalesData,
  getUserStats,
} from '@/modules/admin/admin.controller'
import { UnauthorizedError, ForbiddenError } from '../../../utils/errors'
import { sendResponse } from '../../../utils/response'

jest.mock('../../../utils/response')

describe('Admin Controller', () => {
  let mockReq: Partial<Request & { authUser?: { sub?: string; role?: string } }>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let adminUser: any

  beforeEach(async () => {
    mockReq = {
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
    await User.deleteMany({})
    await Resource.deleteMany({})
    await Course.deleteMany({})
    await Service.deleteMany({})
    await Purchase.deleteMany({})
    jest.clearAllMocks()
  })

  describe('getAnalytics', () => {
    it('should get analytics successfully for admin', async () => {
      await getAnalytics(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          overview: expect.objectContaining({
            totalUsers: expect.any(Number),
            totalResources: expect.any(Number),
            totalCourses: expect.any(Number),
          }),
          recentActivity: expect.any(Object),
        }),
        'Analytics retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined

      await getAnalytics(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'

      await getAnalytics(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })
  })

  describe('getMonthlyStats', () => {
    beforeEach(async () => {
      // Create some test data
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        passwordHash: 'hash',
        role: 'user',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      })
      await Resource.create({
        title: 'Resource 1',
        description: 'Description that is long enough',
        category: 'Web Dev',
        tags: ['test'],
        link: 'https://example.com',
        createdBy: adminUser._id,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      })
    })

    it('should get monthly stats successfully for admin', async () => {
      await getMonthlyStats(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          monthlyStats: expect.any(Array),
        }),
        'Monthly statistics retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
      
      // Verify monthlyStats has 12 months
      const callArgs = (sendResponse as jest.Mock).mock.calls[0]
      expect(callArgs[1].monthlyStats.length).toBe(12)
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockReq.authUser = undefined

      await getMonthlyStats(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'

      await getMonthlyStats(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })
  })

  describe('getSalesData', () => {
    it('should get sales data successfully for admin', async () => {
      await getSalesData(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          summary: expect.any(Object),
          topSelling: expect.any(Object),
        }),
        'Sales data retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'

      await getSalesData(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })
  })

  describe('getUserStats', () => {
    it('should get user stats successfully for admin', async () => {
      await getUserStats(mockReq as Request, mockRes as Response, mockNext)

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes as Response,
        expect.objectContaining({
          totalUsers: expect.any(Number),
          premiumUsers: expect.any(Number),
          regularUsers: expect.any(Number),
        }),
        'User statistics retrieved successfully'
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenError when user is not admin', async () => {
      mockReq.authUser!.role = 'user'

      await getUserStats(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError))
    })
  })
})
