/**
 * Services Module Index Tests
 */

import serviceModule from '../../../modules/services'
import serviceRoutes from '../../../modules/services/service.routes'

jest.mock('../../../modules/services/service.routes', () => {
  return jest.fn()
})

describe('Services Module Index', () => {
  it('should export service routes', () => {
    expect(serviceModule).toBeDefined()
    expect(serviceModule).toBe(serviceRoutes)
  })
})
