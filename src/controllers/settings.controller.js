import { sendState } from '../utils/response.js'

export function createSettingsController(store) {
  return {
    async update(req, res) {
      const userId = req.auth.user.id
      await store.update((db) => {
        const next = { ...db.settings }
        if (req.body?.resultsPublished !== undefined) next.resultsPublished = Boolean(req.body.resultsPublished)
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'livePlayerId')) {
          next.livePlayerId = req.body.livePlayerId || null
        }
        db.settings = next
      })
      sendState(res, store, userId)
    },

    async reset(_req, res) {
      await store.reset()
      sendState(res, store, null)
    },
  }
}
