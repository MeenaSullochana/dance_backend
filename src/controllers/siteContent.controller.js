import { newId } from '../data/store.js'
import { buildClubLeader, buildPanelJudge, moveInList } from '../services/siteContent.service.js'
import { fail, sendState } from '../utils/response.js'

function applyMove(list, id, direction) {
  return moveInList(list, id, direction === 'up' ? 'up' : 'down')
}

export function createSiteContentController(store) {
  return {
    async createPanelJudge(req, res) {
      const built = buildPanelJudge(req.body, null, store.read().panelJudges)
      if (built.error) return fail(res, 400, built.error)
      const userId = req.auth.user.id
      await store.update((db) => {
        db.panelJudges.push({ id: newId('pj'), ...built.item })
      })
      sendState(res, store, userId)
    },

    async updatePanelJudge(req, res) {
      const current = store.read().panelJudges.find((item) => item.id === req.params.id)
      if (!current) return fail(res, 404, 'Panel judge not found')
      const built = buildPanelJudge(req.body, current, store.read().panelJudges)
      if (built.error) return fail(res, 400, built.error)
      const userId = req.auth.user.id
      await store.update((db) => {
        db.panelJudges = db.panelJudges.map((item) => (item.id === req.params.id ? { ...item, ...built.item } : item))
      })
      sendState(res, store, userId)
    },

    async removePanelJudge(req, res) {
      const userId = req.auth.user.id
      const before = store.read().panelJudges.length
      await store.update((db) => {
        db.panelJudges = db.panelJudges.filter((item) => item.id !== req.params.id)
      })
      if (store.read().panelJudges.length === before) return fail(res, 404, 'Panel judge not found')
      sendState(res, store, userId)
    },

    async movePanelJudge(req, res) {
      const userId = req.auth.user.id
      let result
      await store.update((db) => {
        result = applyMove(db.panelJudges, req.params.id, req.body?.direction)
        if (!result.error) db.panelJudges = result.list
      })
      if (result?.error) return fail(res, 404, result.error)
      sendState(res, store, userId)
    },

    async createClubLeader(req, res) {
      const built = buildClubLeader(req.body, null, store.read().clubLeaders)
      if (built.error) return fail(res, 400, built.error)
      const userId = req.auth.user.id
      await store.update((db) => {
        db.clubLeaders.push({ id: newId('ld'), ...built.item })
      })
      sendState(res, store, userId)
    },

    async updateClubLeader(req, res) {
      const current = store.read().clubLeaders.find((item) => item.id === req.params.id)
      if (!current) return fail(res, 404, 'Club leader not found')
      const built = buildClubLeader(req.body, current, store.read().clubLeaders)
      if (built.error) return fail(res, 400, built.error)
      const userId = req.auth.user.id
      await store.update((db) => {
        db.clubLeaders = db.clubLeaders.map((item) => (item.id === req.params.id ? { ...item, ...built.item } : item))
      })
      sendState(res, store, userId)
    },

    async removeClubLeader(req, res) {
      const userId = req.auth.user.id
      const before = store.read().clubLeaders.length
      await store.update((db) => {
        db.clubLeaders = db.clubLeaders.filter((item) => item.id !== req.params.id)
      })
      if (store.read().clubLeaders.length === before) return fail(res, 404, 'Club leader not found')
      sendState(res, store, userId)
    },

    async moveClubLeader(req, res) {
      const userId = req.auth.user.id
      let result
      await store.update((db) => {
        result = applyMove(db.clubLeaders, req.params.id, req.body?.direction)
        if (!result.error) db.clubLeaders = result.list
      })
      if (result?.error) return fail(res, 404, result.error)
      sendState(res, store, userId)
    },
  }
}
