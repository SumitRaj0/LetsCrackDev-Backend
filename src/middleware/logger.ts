/**
 * Request Logger Middleware
 */

import morgan from 'morgan'
import { logger } from '../utils/logger'

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev'

export const requestLogger = morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      logger.info(message.trim())
    },
  },
})

