/**
 * Admin Module Index Tests
 */

import adminModule from '../../../modules/admin'
import adminRoutes from '../../../modules/admin/admin.routes'

jest.mock('../../../modules/admin/admin.routes', () => {
  return jest.fn()
})

describe('Admin Module Index', () => {
  it('should export admin routes', () => {
    expect(adminModule).toBeDefined()
    expect(adminModule).toBe(adminRoutes)
  })
})
