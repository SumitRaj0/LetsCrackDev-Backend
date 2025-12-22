/**
 * List Users Script Tests
 * Tests for src/scripts/listUsers.ts
 * Ensures 100% coverage including all branches and code paths
 */

import mongoose from 'mongoose'

// Mock dotenv before any imports
jest.mock('dotenv', () => ({
  config: jest.fn(),
}))

// Mock dependencies - these must be set up before the script is imported
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../modules/auth/user.model', () => ({
  User: {
    find: jest.fn(),
  },
}))

// Modules will be imported dynamically in each test after resetModules

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

// Mock process.exit
const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never)

// Mock mongoose connection
const mockClose = jest.fn().mockResolvedValue(undefined)
Object.defineProperty(mongoose, 'connection', {
  value: {
    close: mockClose,
  },
  writable: true,
  configurable: true,
})

describe('listUsers Script', () => {
  beforeEach(() => {
    // CRITICAL: Reset modules FIRST to clear cache and get fresh imports
    jest.resetModules()
    jest.clearAllMocks()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
    processExitSpy.mockClear()
    mockClose.mockClear()
    
    // Re-setup mongoose connection mock after resetModules
    Object.defineProperty(mongoose, 'connection', {
      value: {
        close: mockClose,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should list users when users exist - covers lines 25-35 (forEach loop and exit)', async () => {
    // Re-import User after resetModules
    const { User: UserModel } = await import('../../modules/auth/user.model')
    const { default: connectDBMock } = await import('../../config/db')
    
    const mockUsers = [
      {
        name: 'Test User 1',
        email: 'test1@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
      },
      {
        name: 'Test User 2',
        email: 'test2@example.com',
        role: 'admin',
        createdAt: new Date('2024-01-02'),
      },
    ]

    const mockSelect = jest.fn().mockResolvedValue(mockUsers)
    ;(UserModel.find as jest.Mock).mockReturnValue({
      select: mockSelect,
    })
    
    // Reset connectDB mock
    if (connectDBMock && 'mockResolvedValue' in connectDBMock) {
      (connectDBMock as jest.Mock).mockResolvedValue(undefined)
    }

    // Import the script - this executes listUsers() at module load time
    await import('../../scripts/listUsers')

    // Wait for async operations to complete
    // The script executes listUsers() immediately on import
    await new Promise((resolve) => setTimeout(resolve, 600))

    if (connectDBMock && 'mock' in connectDBMock) {
      expect(connectDBMock).toHaveBeenCalled()
    }
    expect(UserModel.find).toHaveBeenCalledWith({ deletedAt: null })
    expect(mockSelect).toHaveBeenCalledWith('name email role createdAt')
    
    // Verify the "Found X user(s)" message (line 25)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 user(s)'))
    
    // Verify forEach loop execution (lines 26-32)
    expect(consoleLogSpy).toHaveBeenCalledWith('1. Name: Test User 1')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Email: test1@example.com')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Role: user')
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Created:'))
    expect(consoleLogSpy).toHaveBeenCalledWith('') // Empty line after user 1
    expect(consoleLogSpy).toHaveBeenCalledWith('2. Name: Test User 2')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Email: test2@example.com')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Role: admin')
    expect(consoleLogSpy).toHaveBeenCalledWith('') // Empty line after user 2
    
    // Verify connection close and exit after listing (lines 34-35)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle no users found - covers if branch lines 19-22', async () => {
    // Re-import User after resetModules
    const { User: UserModel } = await import('../../modules/auth/user.model')
    const { default: connectDBMock } = await import('../../config/db')
    
    const mockSelect = jest.fn().mockResolvedValue([])
    ;(UserModel.find as jest.Mock).mockReturnValue({
      select: mockSelect,
    })
    
    // Reset connectDB mock
    if (connectDBMock && 'mockResolvedValue' in connectDBMock) {
      (connectDBMock as jest.Mock).mockResolvedValue(undefined)
    }

    // Import the script - this executes listUsers() at module load time
    await import('../../scripts/listUsers')

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 600))

    if (connectDBMock && 'mock' in connectDBMock) {
      expect(connectDBMock).toHaveBeenCalled()
    }
    expect(UserModel.find).toHaveBeenCalledWith({ deletedAt: null })
    expect(mockSelect).toHaveBeenCalledWith('name email role createdAt')
    
    // Verify the "no users found" message (line 20)
    expect(consoleLogSpy).toHaveBeenCalledWith('❌ No users found in the database')
    
    // Verify connection close and exit (lines 21-22)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle database connection errors', async () => {
    const { default: connectDBMock } = await import('../../config/db')
    const mockError = new Error('Database connection failed')
    
    if (connectDBMock && 'mockRejectedValueOnce' in connectDBMock) {
      (connectDBMock as jest.Mock).mockRejectedValueOnce(mockError)
    }

    // Import the script
    await import('../../scripts/listUsers')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', mockError)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle user query errors', async () => {
    const { User: UserModel } = await import('../../modules/auth/user.model')
    const { default: connectDBMock } = await import('../../config/db')
    const mockError = new Error('Query failed')
    const mockSelect = jest.fn().mockRejectedValue(mockError)
    ;(UserModel.find as jest.Mock).mockReturnValue({
      select: mockSelect,
    })
    
    if (connectDBMock && 'mockResolvedValue' in connectDBMock) {
      (connectDBMock as jest.Mock).mockResolvedValue(undefined)
    }

    // Import the script
    await import('../../scripts/listUsers')

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 400))

    if (connectDBMock && 'mock' in connectDBMock) {
      expect(connectDBMock).toHaveBeenCalled()
    }
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', mockError)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should display single user correctly - covers forEach loop with one user', async () => {
    const { User: UserModel } = await import('../../modules/auth/user.model')
    const { default: connectDBMock } = await import('../../config/db')
    
    const mockUsers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
    ]

    const mockSelect = jest.fn().mockResolvedValue(mockUsers)
    ;(UserModel.find as jest.Mock).mockReturnValue({
      select: mockSelect,
    })
    
    if (connectDBMock && 'mockResolvedValue' in connectDBMock) {
      (connectDBMock as jest.Mock).mockResolvedValue(undefined)
    }

    // Import the script
    await import('../../scripts/listUsers')

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Verify the "Found X user(s)" message (line 25)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 user(s)'))
    
    // Verify forEach loop execution (lines 26-32)
    expect(consoleLogSpy).toHaveBeenCalledWith('1. Name: John Doe')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Email: john@example.com')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Role: user')
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Created:'))
    expect(consoleLogSpy).toHaveBeenCalledWith('') // Empty line after user
    
    // Verify connection close and exit after listing (lines 34-35)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should handle multiple users in forEach loop - covers all iterations', async () => {
    const { User: UserModel } = await import('../../modules/auth/user.model')
    const { default: connectDBMock } = await import('../../config/db')
    
    const mockUsers = [
      {
        name: 'User 1',
        email: 'user1@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
      },
      {
        name: 'User 2',
        email: 'user2@example.com',
        role: 'admin',
        createdAt: new Date('2024-01-02'),
      },
      {
        name: 'User 3',
        email: 'user3@example.com',
        role: 'user',
        createdAt: new Date('2024-01-03'),
      },
    ]

    const mockSelect = jest.fn().mockResolvedValue(mockUsers)
    ;(UserModel.find as jest.Mock).mockReturnValue({
      select: mockSelect,
    })
    
    if (connectDBMock && 'mockResolvedValue' in connectDBMock) {
      (connectDBMock as jest.Mock).mockResolvedValue(undefined)
    }

    // Import the script
    await import('../../scripts/listUsers')

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Verify the "Found X user(s)" message (line 25)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 3 user(s)'))
    
    // Verify forEach loop execution for all users (lines 26-32)
    expect(consoleLogSpy).toHaveBeenCalledWith('1. Name: User 1')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Email: user1@example.com')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Role: user')
    expect(consoleLogSpy).toHaveBeenCalledWith('2. Name: User 2')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Email: user2@example.com')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Role: admin')
    expect(consoleLogSpy).toHaveBeenCalledWith('3. Name: User 3')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Email: user3@example.com')
    expect(consoleLogSpy).toHaveBeenCalledWith('   Role: user')
    
    // Verify empty lines after each user (line 31) - should be called 3 times
    const emptyLineCalls = consoleLogSpy.mock.calls.filter((call) => call[0] === '')
    expect(emptyLineCalls.length).toBeGreaterThanOrEqual(3)
    
    // Verify connection close and exit after listing (lines 34-35)
    expect(mockClose).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })
})
