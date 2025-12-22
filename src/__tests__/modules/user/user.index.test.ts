/**
 * User Module Index Tests
 */

import userModule from '../../../modules/user'
import userRoutes from '../../../modules/user/user.routes'

jest.mock('../../../modules/user/user.routes', () => {
  return jest.fn()
})

describe('User Module Index', () => {
  it('should export user routes', () => {
    expect(userModule).toBeDefined()
    expect(userModule).toBe(userRoutes)
  })
})
