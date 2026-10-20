import { newId } from '../data/store.js'
import { hashPassword } from '../utils/passwords.js'
import { fail, sendState } from '../utils/response.js'

export function createAccountController(store) {
  return {
    async create(req, res) {
      const name = String(req.body?.name || '').trim()
      const email = String(req.body?.email || '').trim()
      const password = String(req.body?.password || '')
      const role = req.body?.role
      if (!name) return fail(res, 400, 'Name is required')
      if (!email.includes('@')) return fail(res, 400, 'Enter a valid email')
      if (password.length < 4) return fail(res, 400, 'Password must be at least 4 characters')
      if (role !== 'judge' && role !== 'user') return fail(res, 400, 'Please select a valid role')
      if (store.read().users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        return fail(res, 409, 'Email already exists')
      }

      const userId = req.auth.user.id
      await store.update((db) => {
        db.users.push({
          id: newId(role === 'judge' ? 'j' : 'u'),
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          active: true,
          approved: true,
        })
      })
      sendState(res, store, userId)
    },

    async approve(req, res) {
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.users = db.users.map((user) => {
          if (user.id !== req.params.id) return user
          found = true
          return { ...user, approved: true, active: true }
        })
      })
      if (!found) return fail(res, 404, 'Account not found')
      sendState(res, store, userId)
    },

    async toggle(req, res) {
      if (req.params.id === req.auth.user.id) return fail(res, 400, 'You cannot deactivate your own account')
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.users = db.users.map((user) => {
          if (user.id !== req.params.id) return user
          found = true
          return { ...user, active: !user.active }
        })
      })
      if (!found) return fail(res, 404, 'Account not found')
      sendState(res, store, userId)
    },

    async remove(req, res) {
      if (req.params.id === req.auth.user.id) return fail(res, 400, 'You cannot delete your own account')
      const userId = req.auth.user.id
      await store.update((db) => {
        db.users = db.users.filter((user) => user.id !== req.params.id)
        db.scores = db.scores.filter((score) => score.judgeId !== req.params.id)
        for (const [token, id] of Object.entries(db.sessions)) {
          if (id === req.params.id) delete db.sessions[token]
        }
      })
      sendState(res, store, userId)
    },
  }
}
