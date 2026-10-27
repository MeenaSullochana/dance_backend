import { randomBytes } from 'node:crypto'
import { enterAudience, findStaffByEmail } from '../services/access.service.js'
import { present } from '../utils/present.js'
import { fail, sendState } from '../utils/response.js'

function sessionResponse(res, store, result) {
  if (result.error) return fail(res, result.status, result.error)
  const user = store.read().users.find((item) => item.id === result.userId)
  return res.status(result.status).json({ token: result.token, created: Boolean(result.created), ...present(store.read(), user) })
}

export function createAuthController(store) {
  return {
    async login(req, res) {
      const audience =
        req.body?.role === 'user' ||
        req.body?.audience === true ||
        Boolean(req.body?.phone || req.body?.mobile) ||
        (!String(req.body?.email || '').includes('@') && Boolean(String(req.body?.email || '').trim()))

      if (audience) {
        return sessionResponse(
          res,
          store,
          await enterAudience(store, {
            phone: req.body?.phone || req.body?.mobile || req.body?.email,
            name: req.body?.name,
            club: req.body?.club,
            register: false,
          }),
        )
      }

      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      if (!email || !password) return fail(res, 400, 'Enter email and password')

      const user = findStaffByEmail(store.read().users, email, password)
      if (!user) {
        const anyMatch = store.read().users.find(
          (item) => item.email && item.email.toLowerCase() === email,
        )
        if (anyMatch?.role === 'user') {
          return fail(res, 403, 'Audience members sign in with mobile number only')
        }
        return fail(res, 401, 'Invalid email or password')
      }
      if (user.approved === false) return fail(res, 403, 'Your account is waiting for admin approval')
      if (user.active === false) return fail(res, 403, 'This account is deactivated')

      const token = randomBytes(24).toString('hex')
      await store.update((db) => {
        db.sessions[token] = user.id
      })
      res.json({ token, ...present(store.read(), user) })
    },

    async register(req, res) {
      return sessionResponse(
        res,
        store,
        await enterAudience(store, {
          phone: req.body?.phone || req.body?.mobile || req.body?.email,
          name: req.body?.name,
          club: req.body?.club,
          register: true,
        }),
      )
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
