import { newId } from '../data/store.js'
import { assignArrival, buildPlayerPayload } from '../services/player.service.js'
import { fail, sendState } from '../utils/response.js'

export function createPlayerController(store) {
  return {
    async create(req, res) {
      const built = buildPlayerPayload(store.read(), req.body)
      if (built.error) return fail(res, 400, built.error)

      const userId = req.auth.user.id
      await store.update((db) => {
        const chestNo = Math.max(100, ...db.players.map((player) => player.chestNo || 0)) + 1
        db.players.push({
          id: newId('p'),
          chestNo,
          winner: false,
          arrived: false,
          arrivalNo: null,
          ...built.player,
          source: 'spot',
        })
      })
      sendState(res, store, userId)
    },

    async update(req, res) {
      const current = store.read().players.find((player) => player.id === req.params.id)
      if (!current) return fail(res, 404, 'Player not found')
      const built = buildPlayerPayload(store.read(), req.body)
      if (built.error) return fail(res, 400, built.error)
      const moved = Boolean(current.arrivalNo) && current.classificationId !== built.player.classificationId && Boolean(built.player.classificationId)
      if (moved) {
        const preview = assignArrival(store.read(), { ...current, ...built.player, arrivalNo: null, reissue: true })
        if (preview.error) return fail(res, 400, preview.error)
      }

      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.players = db.players.map((player) => {
          if (player.id !== req.params.id) return player
          found = true
          const categoryChanged = player.classificationId !== built.player.classificationId
          let arrivalNo = player.arrivalNo || null
          if (categoryChanged && arrivalNo && built.player.classificationId) {
            arrivalNo = assignArrival(db, { ...player, ...built.player, arrivalNo: null, reissue: true }).arrivalNo || arrivalNo
          }
          return {
            ...player,
            ...built.player,
            chestNo: player.chestNo,
            arrivalNo,
            arrived: Boolean(player.arrived),
            winner: categoryChanged ? false : player.winner,
          }
        })
      })
      if (!found) return fail(res, 404, 'Player not found')
      sendState(res, store, userId)
    },

    async remove(req, res) {
      const userId = req.auth.user.id
      await store.update((db) => {
        db.players = db.players.filter((player) => player.id !== req.params.id)
        db.scores = db.scores.filter((score) => score.playerId !== req.params.id)
        if (db.settings?.livePlayerId === req.params.id) db.settings.livePlayerId = null
      })
      sendState(res, store, userId)
    },

    async toggleWinner(req, res) {
      const userId = req.auth.user.id
      const current = store.read().players.find((player) => player.id === req.params.id)
      if (!current) return fail(res, 404, 'Player not found')
      await store.update((db) => {
        const player = db.players.find((item) => item.id === req.params.id)
        db.players = db.players.map((item) => {
          if (item.id === player.id) return { ...item, winner: !item.winner }
          if (
            !player.winner &&
            item.type === player.type &&
            ((player.classificationId && item.classificationId === player.classificationId) ||
              (!player.classificationId && item.category === player.category))
          ) {
            return { ...item, winner: false }
          }
          return item
        })
      })
      sendState(res, store, userId)
    },

    async setArrived(req, res) {
      const current = store.read().players.find((player) => player.id === req.params.id)
      if (!current) return fail(res, 404, 'Player not found')
      const userId = req.auth.user.id
      const arrived = req.body?.arrived === undefined ? !current.arrived : Boolean(req.body.arrived)
      if (!arrived) {
        await store.update((db) => {
          db.players = db.players.map((player) => (player.id === current.id ? { ...player, arrived: false } : player))
        })
        return sendState(res, store, userId)
      }
      const assigned = assignArrival(store.read(), current)
      if (assigned.error) return fail(res, 400, assigned.error)
      await store.update((db) => {
        const fresh = assignArrival(db, db.players.find((player) => player.id === current.id) || current)
        db.players = db.players.map((player) =>
          player.id === current.id ? { ...player, arrived: true, arrivalNo: fresh.arrivalNo || assigned.arrivalNo } : player,
        )
      })
      sendState(res, store, userId)
    },

    async setLive(req, res) {
      const current = store.read().players.find((player) => player.id === req.params.id)
      if (!current) return fail(res, 404, 'Player not found')
      const userId = req.auth.user.id
      const already = store.read().settings?.livePlayerId === current.id
      const live = req.body?.live === undefined ? !already : Boolean(req.body.live)
      await store.update((db) => {
        db.settings = { ...db.settings, livePlayerId: live ? current.id : null }
      })
      sendState(res, store, userId)
    },
  }
}
