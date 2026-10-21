import { randomBytes } from 'node:crypto'
import { newId } from '../data/store.js'
import { hashPassword, verifyPassword } from '../utils/passwords.js'
import { fail } from '../utils/response.js'
import { splitScores, validateMarks } from '../services/scoring.service.js'
import {
  judgeHome,
  judgePlayerDetail,
  profile,
  userHome,
  userPlayerDetail,
} from '../services/app.service.js'

function findUser(db, email) {
  return db.users.find((user) => user.email.toLowerCase() === String(email || '').trim().toLowerCase())
}

export function createAppController(store) {
  return {
    async login(req, res) {
      const email = String(req.body?.email || '').trim()
      const password = String(req.body?.password || '')
      const role = req.body?.role
      const user = store.read().users.find(
        (item) => item.email.toLowerCase() === email.toLowerCase() && verifyPassword(password, item.passwordHash),
      )
      if (!user) return fail(res, 401, 'Invalid email or password')
      if (role && user.role !== role) return fail(res, 403, `This account is not a ${role}`)
      if (role && role !== 'judge' && role !== 'user') return fail(res, 400, 'App login is for judge or user')
      if (!role && user.role === 'admin') return fail(res, 403, 'Use the website admin login')
      if (user.approved === false) return fail(res, 403, 'Your account is waiting for admin approval')
      if (user.active === false) return fail(res, 403, 'This account is deactivated')

      const token = randomBytes(24).toString('hex')
      await store.update((db) => {
        db.sessions[token] = user.id
      })
      res.json({ token, user: profile(store.read().users.find((item) => item.id === user.id)) })
    },

    async register(req, res) {
      const name = String(req.body?.name || '').trim()
      const email = String(req.body?.email || '').trim()
      const password = String(req.body?.password || '')
      if (!name) return fail(res, 400, 'Name is required')
      if (!email.includes('@')) return fail(res, 400, 'Enter a valid email')
      if (password.length < 4) return fail(res, 400, 'Password must be at least 4 characters')
      if (findUser(store.read(), email)) return fail(res, 409, 'Email already registered')

      await store.update((db) => {
        db.users.push({
          id: newId('u'),
          name,
          email,
          passwordHash: hashPassword(password),
          role: 'user',
          active: true,
          approved: false,
          registeredAt: new Date().toISOString(),
        })
      })
      res.status(201).json({ ok: true, message: 'Registered. You can log in after admin approval.' })
    },

    async logout(req, res) {
      if (req.auth?.token) {
        await store.update((db) => {
          delete db.sessions[req.auth.token]
        })
      }
      res.json({ ok: true })
    },

    me(req, res) {
      res.json({ user: profile(req.auth.user) })
    },

    judgeHome(req, res) {
      const type = ['single', 'couple', 'group'].includes(req.query.type) ? req.query.type : 'single'
      const filter = ['all', 'todo', 'done'].includes(req.query.filter) ? req.query.filter : 'all'
      res.json(judgeHome(store.read(), req.auth.user, { type, filter }))
    },

    judgePlayer(req, res) {
      const player = store.read().players.find((item) => item.id === req.params.id)
      if (!player) return fail(res, 404, 'Player not found')
      res.json(judgePlayerDetail(store.read(), req.auth.user, player))
    },

    async judgeScore(req, res) {
      const playerId = String(req.body?.playerId || '')
      const comment = String(req.body?.comment || '').slice(0, 500)
      const player = store.read().players.find((item) => item.id === playerId)
      if (!player) return fail(res, 404, 'Player not found')
      if (store.read().settings?.livePlayerId !== playerId) {
        return fail(res, 403, 'Marks are open only while this participant is live')
      }
      const checked = validateMarks(store.read(), req.body?.criteria, player.classificationId)
      if (checked.error) return fail(res, 400, checked.error)
      const { criteria, total, maxTotal } = checked
      const judgeId = req.auth.user.id
      await store.update((db) => {
        const existing = db.scores.find((score) => score.playerId === playerId && score.judgeId === judgeId)
        const entry = {
          id: existing?.id || newId('s'),
          playerId,
          judgeId,
          audience: 'judge',
          criteria,
          total,
          comment,
          createdAt: new Date().toISOString(),
        }
        db.scores = existing ? db.scores.map((score) => (score.id === existing.id ? entry : score)) : [...db.scores, entry]
      })

      const db = store.read()
      const scored = db.players.find((item) => item.id === playerId)
      res.json({
        ok: true,
        score: { playerId, criteria, total, comment, maxTotal },
        player: judgePlayerDetail(db, req.auth.user, scored),
      })
    },

    async userScore(req, res) {
      const playerId = String(req.body?.playerId || '')
      const comment = String(req.body?.comment || '').slice(0, 500)
      const player = store.read().players.find((item) => item.id === playerId)
      if (!player) return fail(res, 404, 'Player not found')
      if (store.read().settings?.livePlayerId !== playerId) {
        return fail(res, 403, 'Marks are open only while this participant is live')
      }
      const checked = validateMarks(store.read(), req.body?.criteria, player.classificationId)
      if (checked.error) return fail(res, 400, checked.error)
      const { criteria, total, maxTotal } = checked
      const userId = req.auth.user.id
      await store.update((db) => {
        const existing = db.scores.find((score) => score.playerId === playerId && score.judgeId === userId)
        const entry = {
          id: existing?.id || newId('s'),
          playerId,
          judgeId: userId,
          audience: 'public',
          criteria,
          total,
          comment,
          createdAt: new Date().toISOString(),
        }
        db.scores = existing ? db.scores.map((score) => (score.id === existing.id ? entry : score)) : [...db.scores, entry]
      })
      const db = store.read()
      const split = splitScores(db, playerId)
      res.json({
        ok: true,
        score: { playerId, criteria, total, comment, maxTotal },
        publicAverage: Number(split.publicAverage.toFixed(1)),
        publicCount: split.publicScores.length,
        player: userPlayerDetail(db, db.players.find((item) => item.id === playerId)),
      })
    },

    userHome(req, res) {
      const type = ['single', 'couple', 'group'].includes(req.query.type) ? req.query.type : 'single'
      res.json(userHome(store.read(), req.auth.user, { type }))
    },

    userPlayer(req, res) {
      const player = store.read().players.find((item) => item.id === req.params.id)
      if (!player) return fail(res, 404, 'Player not found')
      res.json(userPlayerDetail(store.read(), player))
    },
  }
}
