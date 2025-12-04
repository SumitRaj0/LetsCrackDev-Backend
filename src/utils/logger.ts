/**
 * Logger Utility
 * Centralized logging with different levels
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

class Logger {
  private logLevel: LogLevel

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex <= currentLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
  }

  error(message: string, error?: Error | unknown, meta?: unknown): void {
    if (this.shouldLog('error')) {
      const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error
      const metaObj = meta && typeof meta === 'object' ? meta : {}
      const errorObj = errorDetails && typeof errorDetails === 'object' ? errorDetails : { error: errorDetails }
      console.error(this.formatMessage('error', message, { ...metaObj, ...errorObj }))
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta))
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta))
    }
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta))
    }
  }
}

export const logger = new Logger()

