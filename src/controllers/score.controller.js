import { newId } from '../data/store.js'
import { validateMarks } from '../services/scoring.service.js'
import { fail, sendState } from '../utils/response.js'

export function createScoreController(store) {
  return {
    async submit(req, res) {
      const playerId = String(req.body?.playerId || '')
      const comment = String(req.body?.comment || '').slice(0, 500)
      const player = store.read().players.find((item) => item.id === playerId)
      if (!player) return fail(res, 404, 'Player not found')
      const checked = validateMarks(store.read(), req.body?.criteria, player.classificationId)
      if (checked.error) return fail(res, 400, checked.error)
      const { criteria, total } = checked
      const judgeId = req.auth.user.id
      await store.update((db) => {
        const existing = db.scores.find((score) => score.playerId === playerId && score.judgeId === judgeId)
        const entry = {
          id: existing?.id || newId('s'),
          playerId,
          judgeId,
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
  }
}
