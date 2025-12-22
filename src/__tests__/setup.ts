/**
 * Jest Test Setup
 * Runs before all tests
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set test environment
process.env.NODE_ENV = 'test'

// Set required environment variables if not present (for testing)
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret-key-for-testing-only-min-32-chars-long'
}
if (!process.env.REFRESH_TOKEN_SECRET) {
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-for-testing-only-min-32-chars-long'
}
if (!process.env.ACCESS_TOKEN_EXPIRES_IN) {
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m'
}
if (!process.env.REFRESH_TOKEN_EXPIRES_IN) {
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d'
}

// MongoDB test connection
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/letscrackdev_test'

beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI)
  }
})

afterAll(async () => {
  // Close database connection
  await mongoose.connection.close()
})

// Clean up database after each test
afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})

