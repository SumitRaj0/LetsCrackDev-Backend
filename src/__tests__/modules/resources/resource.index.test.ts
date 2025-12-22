/**
 * Resources Module Index Tests
 */

import resourceModule from '../../../modules/resources'
import resourceRoutes from '../../../modules/resources/resource.routes'

jest.mock('../../../modules/resources/resource.routes', () => {
  return jest.fn()
})

describe('Resources Module Index', () => {
  it('should export resource routes', () => {
    expect(resourceModule).toBeDefined()
    expect(resourceModule).toBe(resourceRoutes)
  })
})
