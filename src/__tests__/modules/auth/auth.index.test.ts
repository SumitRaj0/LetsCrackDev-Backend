/**
 * Auth Module Index Tests
 */

import authModule from '../../../modules/auth'
import authRoutes from '../../../modules/auth/auth.routes'

jest.mock('../../../modules/auth/auth.routes', () => {
  return jest.fn()
})

describe('Auth Module Index', () => {
  it('should export auth routes', () => {
    expect(authModule).toBeDefined()
    expect(authModule).toBe(authRoutes)
  })
})
