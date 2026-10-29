import { newId } from '../data/store.js'
import { assignArrival, assignRegisteredId, buildPlayerPayload, canGoLive, playerFormatKey } from '../services/player.service.js'
import { fail, sendState } from '../utils/response.js'

function dropLiveIfNeeded(db, playerId) {
  if (db.settings?.livePlayerId === playerId) {
    db.settings.livePlayerId = null
    db.settings.votingOpen = false
  }
}

export function createPlayerController(store) {
  return {
    async create(req, res) {
      const built = buildPlayerPayload(store.read(), req.body)
      if (built.error) return fail(res, 400, built.error)
      if (built.player.classificationId) {
        const registered = assignRegisteredId(store.read(), built.player)
        if (registered.error) return fail(res, 400, registered.error)
      }

      const userId = req.auth.user.id
      await store.update((db) => {
        const chestNo = Math.max(100, ...db.players.map((player) => player.chestNo || 0)) + 1
        const registered = built.player.classificationId ? assignRegisteredId(db, built.player) : {}
        db.players.push({
          id: newId('p'),
          chestNo,
          winner: false,
          arrived: false,
          arrivalNo: null,
          ...built.player,
          registeredId: registered.registeredId || null,
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
      if (built.player.classificationId) {
        const preview = assignRegisteredId(store.read(), {
          ...current,
          ...built.player,
          reissue: current.classificationId !== built.player.classificationId,
        })
        if (preview.error) return fail(res, 400, preview.error)
      }

      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.players = db.players.map((player) => {
          if (player.id !== req.params.id) return player
          found = true
          const categoryChanged = (player.classificationId || null) !== (built.player.classificationId || null)
          const formatChanged = playerFormatKey(player) !== playerFormatKey(built.player)
          let registeredId = player.registeredId || null
          if (built.player.classificationId) {
            if (categoryChanged || !registeredId) {
              registeredId =
                assignRegisteredId(db, {
                  ...player,
                  ...built.player,
                  registeredId: categoryChanged ? null : registeredId,
                  reissue: categoryChanged || !registeredId,
                }).registeredId || registeredId
            }
          }
          let arrivalNo = player.arrivalNo || null
          if (player.arrived && formatChanged) {
            arrivalNo = assignArrival(db, { ...player, ...built.player, arrivalNo: null, reissue: true }).arrivalNo || arrivalNo
          }
          const next = {
            ...player,
            ...built.player,
            chestNo: player.chestNo,
            registeredId,
            arrivalNo,
            arrived: Boolean(player.arrived),
            winner: categoryChanged ? false : player.winner,
          }
          if (!canGoLive(next)) dropLiveIfNeeded(db, player.id)
          return next
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
        if (db.settings?.livePlayerId === req.params.id) {
          db.settings.livePlayerId = null
          db.settings.votingOpen = false
        }
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
          db.players = db.players.map((player) =>
            player.id === current.id ? { ...player, arrived: false, arrivalNo: null } : player,
          )
          dropLiveIfNeeded(db, current.id)
        })
        return sendState(res, store, userId)
      }
      await store.update((db) => {
        const fresh = assignArrival(db, { ...(db.players.find((player) => player.id === current.id) || current), arrivalNo: null, reissue: true })
        db.players = db.players.map((player) =>
          player.id === current.id ? { ...player, arrived: true, arrivalNo: fresh.arrivalNo } : player,
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
      if (live && !canGoLive(current)) {
        if (!current.arrived) return fail(res, 400, 'Mark Arrived before going live')
        return fail(res, 400, 'Audio track must be received before going live')
      }
      await store.update((db) => {
        db.settings = { ...db.settings, livePlayerId: live ? current.id : null, votingOpen: false }
      })
      sendState(res, store, userId)
    },

    async setVoting(req, res) {
      const current = store.read().players.find((player) => player.id === req.params.id)
      if (!current) return fail(res, 404, 'Player not found')
      const userId = req.auth.user.id
      if (store.read().settings?.livePlayerId !== current.id) {
        return fail(res, 400, 'Go live before starting voting')
      }
      const open = req.body?.open === undefined ? true : Boolean(req.body.open)
      await store.update((db) => {
        db.settings = { ...db.settings, votingOpen: open }
      })
      sendState(res, store, userId)
    },
  }
}
