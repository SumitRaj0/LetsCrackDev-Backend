/**
 * Manual mock for auth.middleware
 * Used in tests to provide requireAuth and requireAdmin functions
 */

export const requireAuth = (_req: any, _res: any, next: any): void => {
  next()
}

export const requireAdmin = (_req: any, _res: any, next: any): void => {
  next()
}

