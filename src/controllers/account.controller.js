import { newId } from '../data/store.js'
import { buildJudgeProfile, moveInList } from '../services/siteContent.service.js'
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
      if (store.read().users.some((user) => user.email && user.email.toLowerCase() === email.toLowerCase())) {
        return fail(res, 409, 'Email already exists')
      }

      let profile = {}
      if (role === 'judge') {
        const built = buildJudgeProfile(req.body, null, store.read().users.filter((user) => user.role === 'judge'))
        if (built.error) return fail(res, 400, built.error)
        profile = built.profile
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
          ...profile,
        })
      })
      sendState(res, store, userId)
    },

    async update(req, res) {
      const current = store.read().users.find((user) => user.id === req.params.id)
      if (!current) return fail(res, 404, 'Account not found')
      if (current.role !== 'judge') return fail(res, 400, 'Only judges can be edited here')
      const name = String(req.body?.name || '').trim()
      if (!name) return fail(res, 400, 'Name is required')
      const email = String(req.body?.email || current.email || '').trim()
      if (!email.includes('@')) return fail(res, 400, 'Enter a valid email')
      if (
        store.read().users.some(
          (user) => user.id !== current.id && user.email && user.email.toLowerCase() === email.toLowerCase(),
        )
      ) {
        return fail(res, 409, 'Email already exists')
      }
      const password = String(req.body?.password || '')
      if (password && password.length < 4) return fail(res, 400, 'Password must be at least 4 characters')
      const built = buildJudgeProfile(req.body, current, store.read().users.filter((user) => user.role === 'judge'))
      if (built.error) return fail(res, 400, built.error)

      const userId = req.auth.user.id
      await store.update((db) => {
        db.users = db.users.map((user) => {
          if (user.id !== req.params.id) return user
          return {
            ...user,
            name,
            email,
            ...built.profile,
            passwordHash: password ? hashPassword(password) : user.passwordHash,
          }
        })
      })
      sendState(res, store, userId)
    },

    async move(req, res) {
      const current = store.read().users.find((user) => user.id === req.params.id && user.role === 'judge')
      if (!current) return fail(res, 404, 'Judge not found')
      const userId = req.auth.user.id
      let result
      await store.update((db) => {
        const judges = db.users.filter((user) => user.role === 'judge')
        const others = db.users.filter((user) => user.role !== 'judge')
        result = moveInList(judges, req.params.id, req.body?.direction === 'up' ? 'up' : 'down')
        if (!result.error) db.users = [...others, ...result.list]
      })
      if (result?.error) return fail(res, 404, result.error)
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
