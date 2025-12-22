/**
 * Courses Module Index Tests
 */

import courseModule from '../../../modules/courses'
import courseRoutes from '../../../modules/courses/course.routes'

jest.mock('../../../modules/courses/course.routes', () => {
  return jest.fn()
})

describe('Courses Module Index', () => {
  it('should export course routes', () => {
    expect(courseModule).toBeDefined()
    expect(courseModule).toBe(courseRoutes)
  })
})
