import { randomBytes } from 'node:crypto'
import { enterUser } from '../services/access.service.js'
import { present } from '../utils/present.js'
import { verifyPassword } from '../utils/passwords.js'
import { fail, sendState } from '../utils/response.js'

function sessionResponse(res, store, result) {
  if (result.error) return fail(res, result.status, result.error)
  const user = store.read().users.find((item) => item.id === result.userId)
  return res.status(result.status).json({ token: result.token, created: Boolean(result.created), ...present(store.read(), user) })
}

export function createAuthController(store) {
  return {
    async login(req, res) {
      if (req.body?.role === 'user') {
        return sessionResponse(res, store, await enterUser(store, req.body))
      }

      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      const role = req.body?.role
      const user = store
        .read()
        .users.find((item) => item.email && item.email.toLowerCase() === email && verifyPassword(password, item.passwordHash))
      if (!user) return fail(res, 401, 'Invalid email or password')
      if (role && user.role !== role) return fail(res, 403, `This account is not a ${role}`)
      if (user.approved === false) return fail(res, 403, 'Your account is waiting for admin approval')
      if (user.active === false) return fail(res, 403, 'This account is deactivated')

      const token = randomBytes(24).toString('hex')
      await store.update((db) => {
        db.sessions[token] = user.id
      })
      res.json({ token, ...present(store.read(), user) })
    },

    async register(req, res) {
      return sessionResponse(res, store, await enterUser(store, req.body))
    },

    async logout(req, res) {
      if (req.auth?.token) {
        await store.update((db) => {
          delete db.sessions[req.auth.token]
        })
      }
      sendState(res, store, null)
    },
  }
}
