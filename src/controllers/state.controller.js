import { sendState } from '../utils/response.js'

export function createStateController(store) {
  return {
    async health(_req, res) {
      res.json({ ok: true })
    },
    async getState(req, res) {
      await store.refresh()
      sendState(res, store, req.auth?.user.id)
    },
  }
}
