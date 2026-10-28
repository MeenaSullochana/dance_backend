import { newId } from '../data/store.js'
import { assignRegisteredId } from '../services/player.service.js'
import { previewGoogleFormRows, rowsToPlayers } from '../services/import.service.js'
import { present } from '../utils/present.js'
import { fail } from '../utils/response.js'

export function createImportController(store) {
  return {
    async preview(req, res) {
      try {
        const buffer = Buffer.from(String(req.body?.fileBase64 || ''), 'base64')
        if (!buffer.length) return fail(res, 400, 'Upload an Excel or CSV file')
        const rows = previewGoogleFormRows(store.read(), buffer)
        res.json({
          rows,
          summary: {
            total: rows.length,
            ready: rows.filter((row) => row.ok).length,
            warnings: rows.filter((row) => row.warnings.length).length,
            withClassification: rows.filter((row) => row.classificationId).length,
          },
        })
      } catch (error) {
        return fail(res, 400, error.message || 'Could not read the file')
      }
    },

    async importFile(req, res) {
      try {
        const buffer = Buffer.from(String(req.body?.fileBase64 || ''), 'base64')
        if (!buffer.length) return fail(res, 400, 'Upload an Excel or CSV file')
        const preview = previewGoogleFormRows(store.read(), buffer)
        const ready = preview.filter((row) => row.ok)
        if (!ready.length) return fail(res, 400, 'No valid new rows to import')

        const userId = req.auth.user.id
        await store.update((db) => {
          const startChest = Math.max(100, ...db.players.map((player) => player.chestNo || 0))
          const players = rowsToPlayers(ready, startChest)
          for (const player of players) {
            const registered = assignRegisteredId(db, player)
            db.players.push({
              id: newId(player.type === 'group' ? 'g' : 'p'),
              ...player,
              registeredId: registered.registeredId || null,
              arrived: false,
              arrivalNo: null,
            })
          }
        })
        const state = present(store.read(), store.read().users.find((user) => user.id === userId))
        res.json({
          ...state,
          importResult: {
            imported: ready.length,
            skipped: preview.length - ready.length,
            withClassification: ready.filter((row) => row.classificationId).length,
          },
        })
      } catch (error) {
        return fail(res, 400, error.message || 'Could not import the file')
      }
    },
  }
}
