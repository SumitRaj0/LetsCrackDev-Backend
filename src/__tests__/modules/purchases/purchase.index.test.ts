/**
 * Purchases Module Index Tests
 */

import purchaseModule from '../../../modules/purchases'
import purchaseRoutes from '../../../modules/purchases/purchase.routes'

jest.mock('../../../modules/purchases/purchase.routes', () => {
  return jest.fn()
})

describe('Purchases Module Index', () => {
  it('should export purchase routes', () => {
    expect(purchaseModule).toBeDefined()
    expect(purchaseModule).toBe(purchaseRoutes)
  })
})
