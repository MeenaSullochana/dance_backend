import { newId } from '../data/store.js'
import { criterionKey } from '../services/scoring.service.js'
import { fail, sendState } from '../utils/response.js'

function uniqueKey(list, name, ignoreId) {
  const base = criterionKey(name)
  let key = base
  let n = 2
  while (list.some((item) => item.key === key && item.id !== ignoreId)) {
    key = `${base}_${n}`
    n += 1
  }
  return key
}

export function createCriteriaController(store) {
  return {
    async create(req, res) {
      const name = String(req.body?.name || '').trim()
      const maxMarks = Number(req.body?.maxMarks)
      if (!name) return fail(res, 400, 'Category name is required')
      if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
        return fail(res, 400, 'Max marks must be a whole number from 1 to 100')
      }
      const userId = req.auth.user.id
      await store.update((db) => {
        const sortOrder = Math.max(0, ...db.markCriteria.map((item) => item.sortOrder || 0)) + 1
        db.markCriteria.push({
          id: newId('mc'),
          name,
          key: uniqueKey(db.markCriteria, name),
          maxMarks,
          active: true,
          sortOrder,
        })
      })
      sendState(res, store, userId)
    },

    async update(req, res) {
      const name = String(req.body?.name || '').trim()
      const maxMarks = Number(req.body?.maxMarks)
      if (!name) return fail(res, 400, 'Category name is required')
      if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
        return fail(res, 400, 'Max marks must be a whole number from 1 to 100')
      }
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.markCriteria = db.markCriteria.map((item) => {
          if (item.id !== req.params.id) return item
          found = true
          return {
            ...item,
            name,
            maxMarks,
            active: req.body?.active === undefined ? item.active !== false : Boolean(req.body.active),
          }
        })
      })
      if (!found) return fail(res, 404, 'Mark category not found')
      sendState(res, store, userId)
    },

    async remove(req, res) {
      const userId = req.auth.user.id
      const before = store.read().markCriteria.length
      await store.update((db) => {
        db.markCriteria = db.markCriteria.filter((item) => item.id !== req.params.id)
      })
      if (store.read().markCriteria.length === before) return fail(res, 404, 'Mark category not found')
      sendState(res, store, userId)
    },
  }
}
