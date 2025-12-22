/**
 * Logger Utility Tests
 */

import { logger } from '../../utils/logger'

describe('Logger', () => {
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance
  let consoleDebugSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Test error')
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]')
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Test error')
    })

    it('should log error with Error object', () => {
      const error = new Error('Test error message')
      logger.error('Error occurred', error)
      expect(consoleErrorSpy).toHaveBeenCalled()
      const logMessage = consoleErrorSpy.mock.calls[0][0]
      expect(logMessage).toContain('Error occurred')
      expect(logMessage).toContain('Test error message')
    })

    it('should log error with meta', () => {
      logger.error('Error occurred', undefined, { userId: '123' })
      expect(consoleErrorSpy).toHaveBeenCalled()
      const logMessage = consoleErrorSpy.mock.calls[0][0]
      expect(logMessage).toContain('userId')
    })
  })

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Test warning')
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]')
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Test warning')
    })

    it('should log warning with meta', () => {
      logger.warn('Warning occurred', { action: 'test' })
      expect(consoleWarnSpy).toHaveBeenCalled()
      const logMessage = consoleWarnSpy.mock.calls[0][0]
      expect(logMessage).toContain('action')
    })
  })

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test info')
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[INFO]')
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('Test info')
    })

    it('should log info with meta', () => {
      logger.info('Info message', { data: 'test' })
      expect(consoleInfoSpy).toHaveBeenCalled()
    })
  })

  describe('debug', () => {
    it('should log debug message when LOG_LEVEL is debug', () => {
      const originalLogLevel = process.env.LOG_LEVEL
      process.env.LOG_LEVEL = 'debug'
      
      // Re-import logger to get new instance with updated LOG_LEVEL
      jest.resetModules()
      const { logger: newLogger } = require('../../utils/logger')
      newLogger.debug('Test debug')
      
      expect(consoleDebugSpy).toHaveBeenCalled()
      
      process.env.LOG_LEVEL = originalLogLevel
    })
  })

  describe('log level filtering', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      const originalLogLevel = process.env.LOG_LEVEL
      process.env.LOG_LEVEL = 'error'
      
      jest.resetModules()
      const { logger: newLogger } = require('../../utils/logger')
      
      newLogger.error('Error message')
      newLogger.warn('Warning message')
      newLogger.info('Info message')
      
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      
      process.env.LOG_LEVEL = originalLogLevel
    })
  })
})
