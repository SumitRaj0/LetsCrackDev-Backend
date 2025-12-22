/**
 * Razorpay Configuration Tests
 */

import { RAZORPAY_WEBHOOK_SECRET, RAZORPAY_CONFIG } from '../../config/razorpay'

jest.mock('../../utils/logger')

describe('Razorpay Configuration', () => {
  const originalKeyId = process.env.RAZORPAY_KEY_ID
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

  afterEach(() => {
    process.env.RAZORPAY_KEY_ID = originalKeyId
    process.env.RAZORPAY_KEY_SECRET = originalKeySecret
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret
    jest.clearAllMocks()
  })

  const remockLogger = () => {
    const mocked = require('../../utils/logger')
    mocked.logger.warn = jest.fn()
    mocked.logger.info = jest.fn()
    return mocked.logger
  }

  it('should export RAZORPAY_CONFIG with correct structure', () => {
    expect(RAZORPAY_CONFIG).toMatchObject({
      currency: 'INR',
      defaultSuccessUrl: expect.any(String),
      defaultCancelUrl: expect.any(String),
    })
  })

  it('should export RAZORPAY_WEBHOOK_SECRET', () => {
    expect(typeof RAZORPAY_WEBHOOK_SECRET).toBe('string')
  })

  it('should log warning when RAZORPAY_KEY_ID is not set', () => {
    delete process.env.RAZORPAY_KEY_ID
    jest.resetModules()
    const remocked = remockLogger()
    require('../../config/razorpay')
    expect(remocked.warn).toHaveBeenCalledWith(
      expect.stringContaining('RAZORPAY_KEY_ID is not set')
    )
  })

  it('should log warning when RAZORPAY_KEY_SECRET is not set', () => {
    delete process.env.RAZORPAY_KEY_SECRET
    jest.resetModules()
    const remocked = remockLogger()
    require('../../config/razorpay')
    expect(remocked.warn).toHaveBeenCalledWith(
      expect.stringContaining('RAZORPAY_KEY_SECRET is not set')
    )
  })

  it('should log info when RAZORPAY_WEBHOOK_SECRET is not set', () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    jest.resetModules()
    const remocked = remockLogger()
    require('../../config/razorpay')
    expect(remocked.info).toHaveBeenCalledWith(
      expect.stringContaining('RAZORPAY_WEBHOOK_SECRET is not set')
    )
  })

  it('should initialize razorpay when both key ID and secret are set', () => {
    process.env.RAZORPAY_KEY_ID = 'test_key_id'
    process.env.RAZORPAY_KEY_SECRET = 'test_key_secret'
    jest.resetModules()
    const { razorpay: testRazorpay } = require('../../config/razorpay')
    expect(testRazorpay).toBeDefined()
  })

  it('should set razorpay to null when keys are missing', () => {
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    jest.resetModules()
    const { razorpay: testRazorpay } = require('../../config/razorpay')
    expect(testRazorpay).toBeNull()
  })
})

