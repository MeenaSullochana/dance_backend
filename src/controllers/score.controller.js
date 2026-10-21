import { newId } from '../data/store.js'
import { splitScores, validateMarks } from '../services/scoring.service.js'
import { fail, sendState } from '../utils/response.js'

export function createScoreController(store) {
  return {
    async submit(req, res) {
      const playerId = String(req.body?.playerId || '')
      const comment = String(req.body?.comment || '').slice(0, 500)
      const player = store.read().players.find((item) => item.id === playerId)
      if (!player) return fail(res, 404, 'Player not found')
      if (store.read().settings?.livePlayerId !== playerId) {
        return fail(res, 403, 'Marks are open only while this participant is live')
      }
      const checked = validateMarks(store.read(), req.body?.criteria, player.classificationId)
      if (checked.error) return fail(res, 400, checked.error)
      const { criteria, total } = checked
      const judgeId = req.auth.user.id
      const audience = req.auth.user.role === 'user' ? 'public' : 'judge'
      await store.update((db) => {
        const existing = db.scores.find((score) => score.playerId === playerId && score.judgeId === judgeId)
        const entry = {
          id: existing?.id || newId('s'),
          playerId,
          judgeId,
          audience,
          criteria,
          total,
          comment,
          createdAt: new Date().toISOString(),
        }
        db.scores = existing
          ? db.scores.map((score) => (score.id === existing.id ? entry : score))
          : [...db.scores, entry]
      })
      sendState(res, store, judgeId)
    },

    async findWinners(req, res) {
      await store.update((db) => {
        const grouped = new Map()
        for (const player of db.players) {
          if (!player.classificationId) continue
          const { judgeAverage, judgeScores } = splitScores(db, player.id)
          const row = { id: player.id, name: player.name, avg: judgeScores.length ? judgeAverage : -1, count: judgeScores.length }
          const list = grouped.get(player.classificationId) || []
          list.push(row)
          grouped.set(player.classificationId, list)
        }
        const winnerIds = new Set()
        for (const list of grouped.values()) {
          const [top] = list
            .filter((item) => item.count > 0)
            .sort((a, b) => b.avg - a.avg || b.count - a.count || a.name.localeCompare(b.name))
          if (top) winnerIds.add(top.id)
        }
        db.players = db.players.map((player) => ({ ...player, winner: winnerIds.has(player.id) }))
      })
      sendState(res, store, req.auth.user.id)
    },
  }
}
