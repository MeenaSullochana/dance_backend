import { fail, sendState } from '../utils/response.js'

export function createSettingsController(store) {
  return {
    async update(req, res) {
      const userId = req.auth.user.id
      let publicMaxMarks = null
      if (req.body?.publicMaxMarks !== undefined) {
        publicMaxMarks = Number(req.body.publicMaxMarks)
        if (!Number.isInteger(publicMaxMarks) || publicMaxMarks < 1 || publicMaxMarks > 100) {
          return fail(res, 400, 'User overall mark must be a whole number from 1 to 100')
        }
      }
      await store.update((db) => {
        const next = { ...db.settings }
        if (req.body?.resultsPublished !== undefined) next.resultsPublished = Boolean(req.body.resultsPublished)
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'livePlayerId')) {
          next.livePlayerId = req.body.livePlayerId || null
          if (!next.livePlayerId) next.votingOpen = false
        }
        if (req.body?.votingOpen !== undefined) {
          next.votingOpen = Boolean(req.body.votingOpen) && Boolean(next.livePlayerId)
        }
        if (publicMaxMarks !== null) next.publicMaxMarks = publicMaxMarks
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
