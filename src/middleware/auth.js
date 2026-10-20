import { fail, viewerFrom } from '../utils/response.js'

export function createAuthMiddleware(store) {
  return async (req, _res, next) => {
    try {
      await store.refresh()
      const header = req.headers.authorization || ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : ''
      const userId = token ? store.read().sessions[token] : ''
      const user = userId ? viewerFrom(store.read(), userId) : null
      if (user && user.active !== false) {
        req.auth = { token, user }
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return fail(res, 401, 'Please log in')
    if (!roles.includes(req.auth.user.role)) return fail(res, 403, 'You do not have access to this action')
    next()
  }
}
