/**
 * Make Admin Script Tests
 * Tests for src/scripts/makeAdmin.ts
 */

import mongoose from 'mongoose'
import { User } from '../../modules/auth/user.model'
import connectDB from '../../config/db'

// Mock dotenv before importing
jest.mock('dotenv', () => ({
  config: jest.fn(),
}))

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
  },
}))

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

// Mock process.exit
const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never)

// Mock process.argv
const originalArgv = process.argv

// Mock mongoose connection
const mockClose = jest.fn().mockResolvedValue(undefined)
Object.defineProperty(mongoose, 'connection', {
  value: {
    close: mockClose,
  },
  writable: true,
})

describe('makeAdmin Script', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
    processExitSpy.mockClear()
    mockClose.mockClear()
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.argv = originalArgv
  })

  it('should promote user to admin when user exists and is not admin', async () => {
    const mockUser = {
      email: 'test@example.com',
      role: 'user',
      save: jest.fn().mockResolvedValue(undefined),
    }

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    process.argv = ['node', 'makeAdmin.ts', 'test@example.com']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(connectDB).toHaveBeenCalled()
    expect(User.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
    })
    expect(mockUser.role).toBe('admin')
    expect(mockUser.save).toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '✅ Successfully promoted "test@example.com" to admin role'
    )
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle user already being admin', async () => {
    const mockUser = {
      email: 'admin@example.com',
      role: 'admin',
    }

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    process.argv = ['node', 'makeAdmin.ts', 'admin@example.com']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(connectDB).toHaveBeenCalled()
    expect(User.findOne).toHaveBeenCalledWith({
      email: 'admin@example.com',
    })
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '✅ User "admin@example.com" is already an admin'
    )
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle user not found', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    process.argv = ['node', 'makeAdmin.ts', 'nonexistent@example.com']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(connectDB).toHaveBeenCalled()
    expect(User.findOne).toHaveBeenCalledWith({
      email: 'nonexistent@example.com',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ User with email "nonexistent@example.com" not found'
    )
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle missing email argument', async () => {
    process.argv = ['node', 'makeAdmin.ts']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Please provide an email address')
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Usage: npx ts-node src/scripts/makeAdmin.ts <user-email>'
    )
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle database connection errors', async () => {
    const mockError = new Error('Database connection failed')
    ;(connectDB as jest.Mock).mockRejectedValueOnce(mockError)
    process.argv = ['node', 'makeAdmin.ts', 'test@example.com']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', mockError)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle user save errors', async () => {
    const mockUser = {
      email: 'test@example.com',
      role: 'user',
      save: jest.fn().mockRejectedValue(new Error('Save failed')),
    }

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    process.argv = ['node', 'makeAdmin.ts', 'test@example.com']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should normalize email to lowercase and trim', async () => {
    const mockUser = {
      email: 'test@example.com',
      role: 'user',
      save: jest.fn().mockResolvedValue(undefined),
    }

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    process.argv = ['node', 'makeAdmin.ts', '  TEST@EXAMPLE.COM  ']

    // Import and run the script
    await import('../../scripts/makeAdmin')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(User.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
    })
  })
})

