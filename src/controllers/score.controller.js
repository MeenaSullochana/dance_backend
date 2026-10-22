import { newId } from '../data/store.js'
import { buildPodium, validateMarks } from '../services/scoring.service.js'
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
        const podium = buildPodium(db)
        const categoryWinnerIds = new Set(
          podium.categories.map((item) => item.places[0]?.playerId).filter(Boolean),
        )
        db.settings = { ...db.settings, podium }
        db.players = db.players.map((player) => ({ ...player, winner: categoryWinnerIds.has(player.id) }))
      })
      sendState(res, store, req.auth.user.id)
    },
  }
}
