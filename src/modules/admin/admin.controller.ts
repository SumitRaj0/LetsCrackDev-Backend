/**
 * Admin Controller
 * Handles admin dashboard analytics and statistics
 */

import { Request, Response, NextFunction } from 'express'
import { User } from '../auth/user.model'
import { Resource } from '../resources/resource.model'
import { Course } from '../courses/course.model'
import { Service } from '../services/service.model'
import { Purchase } from '../purchases/purchase.model'
import { UnauthorizedError, ForbiddenError } from '../../utils/errors'
import { sendResponse } from '../../utils/response'

/**
 * Get admin dashboard statistics
 * GET /api/v1/admin/analytics
 */
export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userRole = authUser?.role

    if (!authUser) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    // Get total counts
    const [
      totalUsers,
      totalResources,
      totalCourses,
      totalServices,
      totalPremiumUsers,
      totalPurchases,
      completedPurchases,
      totalRevenue,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      Resource.countDocuments({ deletedAt: null }),
      Course.countDocuments({ deletedAt: null }),
      Service.countDocuments({ deletedAt: null }),
      User.countDocuments({ isPremium: true, deletedAt: null }),
      Purchase.countDocuments(),
      Purchase.countDocuments({ status: 'completed' }),
      Purchase.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      newUsersLast30Days,
      newResourcesLast30Days,
      newCoursesLast30Days,
      newPurchasesLast30Days,
      revenueLast30Days,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, deletedAt: null }),
      Resource.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, deletedAt: null }),
      Course.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, deletedAt: null }),
      Purchase.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, status: 'completed' }),
      Purchase.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    const revenue30Days = revenueLast30Days.length > 0 ? revenueLast30Days[0].total : 0

    sendResponse(
      res,
      {
        overview: {
          totalUsers,
          totalResources,
          totalCourses,
          totalServices,
          totalPremiumUsers,
          totalPurchases,
          completedPurchases,
          totalRevenue: revenue,
        },
        recentActivity: {
          newUsersLast30Days,
          newResourcesLast30Days,
          newCoursesLast30Days,
          newPurchasesLast30Days,
          revenueLast30Days: revenue30Days,
        },
      },
      'Analytics retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get monthly statistics
 * GET /api/v1/admin/analytics/monthly
 */
export const getMonthlyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userRole = authUser?.role

    if (!authUser) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    // Get last 12 months of data
    const months: Array<{
      month: string
      year: number
      monthNumber: number
      users: number
      resources: number
      courses: number
      purchases: number
      revenue: number
    }> = []

    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

      const monthName = date.toLocaleString('default', { month: 'short' })
      const year = date.getFullYear()
      const monthNumber = date.getMonth() + 1

      const [users, resources, courses, purchases, revenue] = await Promise.all([
        User.countDocuments({
          createdAt: { $gte: date, $lt: nextMonth },
          deletedAt: null,
        }),
        Resource.countDocuments({
          createdAt: { $gte: date, $lt: nextMonth },
          deletedAt: null,
        }),
        Course.countDocuments({
          createdAt: { $gte: date, $lt: nextMonth },
          deletedAt: null,
        }),
        Purchase.countDocuments({
          createdAt: { $gte: date, $lt: nextMonth },
          status: 'completed',
        }),
        Purchase.aggregate([
          {
            $match: {
              status: 'completed',
              createdAt: { $gte: date, $lt: nextMonth },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ])

      const monthRevenue = revenue.length > 0 ? revenue[0].total : 0

      months.push({
        month: monthName,
        year,
        monthNumber,
        users,
        resources,
        courses,
        purchases,
        revenue: monthRevenue,
      })
    }

    sendResponse(res, { monthlyStats: months }, 'Monthly statistics retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get sales data
 * GET /api/v1/admin/analytics/sales
 */
export const getSalesData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userRole = authUser?.role

    if (!authUser) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    // Get purchase statistics by type
    const [servicePurchases, coursePurchases, totalRevenue, averageOrderValue] = await Promise.all([
      Purchase.countDocuments({ purchaseType: 'service', status: 'completed' }),
      Purchase.countDocuments({ purchaseType: 'course', status: 'completed' }),
      Purchase.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Purchase.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0
    const avgOrder =
      averageOrderValue.length > 0 && averageOrderValue[0].count > 0
        ? averageOrderValue[0].total / averageOrderValue[0].count
        : 0

    // Get top selling services and courses
    const [topServices, topCourses] = await Promise.all([
      Purchase.aggregate([
        { $match: { purchaseType: 'service', status: 'completed' } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'services',
            localField: '_id',
            foreignField: '_id',
            as: 'service',
          },
        },
        { $unwind: '$service' },
        {
          $project: {
            serviceId: '$_id',
            serviceName: '$service.name',
            purchases: '$count',
          },
        },
      ]),
      Purchase.aggregate([
        { $match: { purchaseType: 'course', status: 'completed' } },
        { $group: { _id: '$courseId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'course',
          },
        },
        { $unwind: '$course' },
        {
          $project: {
            courseId: '$_id',
            courseName: '$course.title',
            purchases: '$count',
          },
        },
      ]),
    ])

    sendResponse(
      res,
      {
        summary: {
          totalRevenue: revenue,
          totalPurchases: servicePurchases + coursePurchases,
          servicePurchases,
          coursePurchases,
          averageOrderValue: Math.round(avgOrder * 100) / 100,
        },
        topSelling: {
          services: topServices,
          courses: topCourses,
        },
      },
      'Sales data retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Get user statistics
 * GET /api/v1/admin/analytics/users
 */
export const getUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = (req as Request & { authUser?: { sub?: string; role?: string } }).authUser
    const userRole = authUser?.role

    if (!authUser) {
      throw new UnauthorizedError('Not authenticated')
    }

    if (userRole !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }

    const [totalUsers, premiumUsers, regularUsers, adminUsers, activeUsers] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ isPremium: true, deletedAt: null }),
      User.countDocuments({ isPremium: false, role: 'user', deletedAt: null }),
      User.countDocuments({ role: 'admin', deletedAt: null }),
      User.countDocuments({ deletedAt: null }), // Active users (not deleted)
    ])

    // Get users by registration month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const usersByMonth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ])

    sendResponse(
      res,
      {
        totalUsers,
        premiumUsers,
        regularUsers,
        adminUsers,
        activeUsers,
        usersByMonth: usersByMonth.map((item) => ({
          month: item._id.month,
          year: item._id.year,
          count: item.count,
        })),
      },
      'User statistics retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

