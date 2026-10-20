import { randomBytes } from 'node:crypto'
import { newId } from '../data/store.js'
import { present } from '../utils/present.js'
import { hashPassword, verifyPassword } from '../utils/passwords.js'
import { fail, sendState } from '../utils/response.js'

const REGISTER_ROLES = ['user']

export function createAuthController(store) {
  return {
    async login(req, res) {
      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      const role = req.body?.role
      const user = store
        .read()
        .users.find((item) => item.email.toLowerCase() === email && verifyPassword(password, item.passwordHash))
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
      const name = String(req.body?.name || '').trim()
      const email = String(req.body?.email || '').trim()
      const password = String(req.body?.password || '')
      const role = req.body?.role
      if (!name) return fail(res, 400, 'Name is required')
      if (!email.includes('@')) return fail(res, 400, 'Enter a valid email')
      if (password.length < 4) return fail(res, 400, 'Password must be at least 4 characters')
      if (!REGISTER_ROLES.includes(role)) return fail(res, 400, 'Please select a valid role')

      const db = store.read()
      if (db.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        return fail(res, 409, 'Email already registered')
      }

      await store.update((data) => {
        data.users.push({
          id: newId(role === 'judge' ? 'j' : 'u'),
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          active: true,
          approved: false,
          registeredAt: new Date().toISOString(),
        })
      })
      res.status(201).json({ ok: true })
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
