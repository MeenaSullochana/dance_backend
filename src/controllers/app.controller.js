import { randomBytes } from 'node:crypto'
import { newId } from '../data/store.js'
import { enterUser } from '../services/access.service.js'
import { verifyPassword } from '../utils/passwords.js'
import { fail } from '../utils/response.js'
import { splitScores, validateMarks } from '../services/scoring.service.js'
import {
  judgeHome,
  judgePlayerDetail,
  profile,
  userHome,
  userPlayerDetail,
} from '../services/app.service.js'

function userSession(res, store, result) {
  if (result.error) return fail(res, result.status, result.error)
  const user = store.read().users.find((item) => item.id === result.userId)
  return res.status(result.status).json({
    token: result.token,
    created: Boolean(result.created),
    user: profile(user),
  })
}

export function createAppController(store) {
  return {
    async login(req, res) {
      const role = req.body?.role
      if (role === 'judge') {
        const email = String(req.body?.email || '').trim().toLowerCase()
        const password = String(req.body?.password || '')
        const user = store.read().users.find(
          (item) => item.email && item.email.toLowerCase() === email && verifyPassword(password, item.passwordHash),
        )
        if (!user) return fail(res, 401, 'Invalid email or password')
        if (user.role !== 'judge') return fail(res, 403, 'This account is not a judge')
        if (user.active === false) return fail(res, 403, 'This account is deactivated')
        const token = randomBytes(24).toString('hex')
        await store.update((db) => {
          db.sessions[token] = user.id
        })
        return res.json({ token, user: profile(store.read().users.find((item) => item.id === user.id)) })
      }
      if (role && role !== 'user') return fail(res, 400, 'App login is for judge or user')
      return userSession(res, store, await enterUser(store, req.body))
    },

    async register(req, res) {
      return userSession(res, store, await enterUser(store, req.body))
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
