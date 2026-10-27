import { newId } from '../data/store.js'
import { buildPodium, validateMarks, validatePublicMark } from '../services/scoring.service.js'
import { fail, sendState } from '../utils/response.js'

export function createScoreController(store) {
  return {
    async submit(req, res) {
      const playerId = String(req.body?.playerId || '')
      const comment = String(req.body?.comment || '').slice(0, 500)
      const player = store.read().players.find((item) => item.id === playerId)
      if (!player) return fail(res, 404, 'Player not found')
      if (store.read().settings?.livePlayerId !== playerId) {
        return fail(res, 403, 'Voting lines will open only during/ after the performance')
      }
      const isAudience = req.auth.user.role === 'user'
      const judgeId = req.auth.user.id
      if (isAudience) {
        const already = store.read().scores.find((score) => score.playerId === playerId && score.judgeId === judgeId)
        if (already) return fail(res, 403, 'You already voted. Voting cannot be changed.')
      }
      const checked = isAudience
        ? validatePublicMark(store.read(), req.body?.criteria || req.body)
        : validateMarks(store.read(), req.body?.criteria, player.classificationId)
      if (checked.error) return fail(res, 400, checked.error)
      const { criteria, total } = checked
      const audience = isAudience ? 'public' : 'judge'
      await store.update((db) => {
        const existing = db.scores.find((score) => score.playerId === playerId && score.judgeId === judgeId)
        if (isAudience && existing) {
          return
        }
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
