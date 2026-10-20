import { newId } from '../data/store.js'
import { criterionKey } from '../services/scoring.service.js'
import { buildClassificationName, normalizeKey } from '../services/taxonomy.service.js'
import { fail, sendState } from '../utils/response.js'

function cleanFormatKeys(value, fallback) {
  const allowed = ['solo', 'couple', 'group']
  const list = Array.isArray(value) ? value.map((item) => String(item)) : []
  const keys = [...new Set(list.filter((item) => allowed.includes(item)))]
  return keys.length ? keys : fallback
}

function cleanPrice(value) {
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0 || price > 1000000) return null
  return Math.round(price)
}

export function createTaxonomyController(store) {
  return {
    async createAgeBand(req, res) {
      const name = String(req.body?.name || '').trim()
      const minAge = Number(req.body?.minAge)
      const maxAge = Number(req.body?.maxAge)
      if (!name) return fail(res, 400, 'Age band name is required')
      if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 1 || maxAge < minAge) {
        return fail(res, 400, 'Enter a valid age range')
      }
      const formatKeys = cleanFormatKeys(req.body?.formatKeys, ['solo'])
      const userId = req.auth.user.id
      await store.update((db) => {
        db.ageBands.push({ id: newId('ab'), name, minAge, maxAge, active: true, formatKeys })
      })
      sendState(res, store, userId)
    },

    async updateAgeBand(req, res) {
      const name = String(req.body?.name || '').trim()
      const minAge = Number(req.body?.minAge)
      const maxAge = Number(req.body?.maxAge)
      if (!name) return fail(res, 400, 'Age band name is required')
      if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 1 || maxAge < minAge) {
        return fail(res, 400, 'Enter a valid age range')
      }
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.ageBands = db.ageBands.map((band) => {
          if (band.id !== req.params.id) return band
          found = true
          return {
            ...band,
            name,
            minAge,
            maxAge,
            formatKeys: req.body?.formatKeys === undefined ? band.formatKeys || ['solo'] : cleanFormatKeys(req.body.formatKeys, band.formatKeys || ['solo']),
            active: req.body?.active === undefined ? band.active : Boolean(req.body.active),
          }
        })
      })
      if (!found) return fail(res, 404, 'Age band not found')
      sendState(res, store, userId)
    },

    async deleteAgeBand(req, res) {
      const userId = req.auth.user.id
      await store.update((db) => {
        const removed = new Set(db.classifications.filter((item) => item.ageBandId === req.params.id).map((item) => item.id))
        db.ageBands = db.ageBands.filter((band) => band.id !== req.params.id)
        db.classifications = db.classifications.filter((item) => item.ageBandId !== req.params.id)
        db.categoryParameters = (db.categoryParameters || []).filter((item) => !removed.has(item.classificationId))
      })
      sendState(res, store, userId)
    },

    async createParticipantType(req, res) {
      const name = String(req.body?.name || '').trim()
      if (!name) return fail(res, 400, 'Type name is required')
      const key = normalizeKey(req.body?.key || name).replace(/\s+/g, '') || newId('type')
      if (store.read().participantTypes.some((type) => type.key === key)) {
        return fail(res, 409, 'That participant type already exists')
      }
      const formatKeys = cleanFormatKeys(req.body?.formatKeys, ['solo'])
      const userId = req.auth.user.id
      await store.update((db) => {
        db.participantTypes.push({ id: newId('pt'), name, key, active: true, formatKeys })
      })
      sendState(res, store, userId)
    },

    async updateParticipantType(req, res) {
      const name = String(req.body?.name || '').trim()
      if (!name) return fail(res, 400, 'Type name is required')
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.participantTypes = db.participantTypes.map((type) => {
          if (type.id !== req.params.id) return type
          found = true
          return {
            ...type,
            name,
            formatKeys: req.body?.formatKeys === undefined ? type.formatKeys || [] : cleanFormatKeys(req.body.formatKeys, type.formatKeys || []),
            active: req.body?.active === undefined ? type.active : Boolean(req.body.active),
          }
        })
      })
      if (!found) return fail(res, 404, 'Participant type not found')
      sendState(res, store, userId)
    },

    async deleteParticipantType(req, res) {
      const userId = req.auth.user.id
      await store.update((db) => {
        const removed = new Set(
          db.classifications.filter((item) => item.participantTypeId === req.params.id).map((item) => item.id),
        )
        db.participantTypes = db.participantTypes.filter((type) => type.id !== req.params.id)
        db.classifications = db.classifications.filter((item) => item.participantTypeId !== req.params.id)
        db.categoryParameters = (db.categoryParameters || []).filter((item) => !removed.has(item.classificationId))
      })
      sendState(res, store, userId)
    },

    async createFormat(req, res) {
      const name = String(req.body?.name || '').trim()
      const key = normalizeKey(req.body?.key || name).replace(/\s+/g, '')
      if (!name || !['solo', 'couple', 'group'].includes(key)) {
        return fail(res, 400, 'Format must be Solo, Couple, or Group')
      }
      if (store.read().formats.some((format) => format.key === key)) {
        return fail(res, 409, 'That format already exists')
      }
      const userId = req.auth.user.id
      await store.update((db) => {
        db.formats.push({ id: newId('pf'), name, key, active: true })
      })
      sendState(res, store, userId)
    },

    async updateFormat(req, res) {
      const name = String(req.body?.name || '').trim()
      if (!name) return fail(res, 400, 'Format name is required')
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.formats = db.formats.map((format) => {
          if (format.id !== req.params.id) return format
          found = true
          return {
            ...format,
            name,
            active: req.body?.active === undefined ? format.active : Boolean(req.body.active),
          }
        })
      })
      if (!found) return fail(res, 404, 'Format not found')
      sendState(res, store, userId)
    },

    async createClassification(req, res) {
      const formatId = String(req.body?.formatId || '')
      const db = store.read()
      const format = db.formats.find((item) => item.id === formatId)
      if (!format) return fail(res, 400, 'Choose Solo / Couple / Group')
      const price = cleanPrice(req.body?.price ?? 0)
      if (price === null) return fail(res, 400, 'Enter a valid price')
      const ageBandId = format.key === 'group' ? null : String(req.body?.ageBandId || '')
      const participantTypeId = format.key === 'group' ? String(req.body?.participantTypeId || '') : null
      if (format.key === 'group') {
        if (!db.participantTypes.some((type) => type.id === participantTypeId)) {
          return fail(res, 400, 'Choose the group type, such as Rotaractor')
        }
      } else if (!db.ageBands.some((band) => band.id === ageBandId)) {
        return fail(res, 400, 'Choose the age category for this format')
      }
      if (
        db.classifications.some(
          (item) =>
            item.kind === 'category' &&
            item.formatId === formatId &&
            (item.ageBandId || null) === ageBandId &&
            (item.participantTypeId || null) === participantTypeId,
        )
      ) {
        return fail(res, 409, 'That category already exists')
      }
      const draft = { name: String(req.body?.name || '').trim(), ageBandId, participantTypeId, formatId }
      const userId = req.auth.user.id
      await store.update((data) => {
        const id = newId('cl')
        data.classifications.push({
          id,
          name: buildClassificationName(data, draft),
          ageBandId,
          participantTypeId,
          formatId,
          price,
          active: true,
          kind: 'category',
          parametersSeeded: true,
        })
        data.categoryParameters.push(
          ...[
            ['technique', 'Technique', 10],
            ['expression', 'Expression', 10],
            ['timing', 'Timing & Rhythm', 10],
            ['costume', 'Costume & Stage', 10],
          ].map(([key, name, maxMarks], index) => ({
            id: newId('cp'),
            classificationId: id,
            name,
            key,
            maxMarks,
            sortOrder: index + 1,
            active: true,
          })),
        )
      })
      sendState(res, store, userId)
    },

    async updateClassification(req, res) {
      if (req.body?.price !== undefined && cleanPrice(req.body.price) === null) {
        return fail(res, 400, 'Enter a valid price')
      }
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.classifications = db.classifications.map((item) => {
          if (item.id !== req.params.id) return item
          found = true
          const next = {
            ...item,
            ageBandId: req.body?.ageBandId === undefined ? item.ageBandId : req.body.ageBandId || null,
            participantTypeId: req.body?.participantTypeId === undefined ? item.participantTypeId : req.body.participantTypeId || null,
            formatId: req.body?.formatId || item.formatId,
            price: req.body?.price === undefined ? item.price ?? 0 : cleanPrice(req.body.price),
            active: req.body?.active === undefined ? item.active : Boolean(req.body.active),
            kind: item.kind || 'category',
          }
          next.name = buildClassificationName(db, {
            ...next,
            name: req.body?.name !== undefined ? String(req.body.name || '').trim() : item.name,
          })
          return next
        })
      })
      if (!found) return fail(res, 404, 'Classification not found')
      sendState(res, store, userId)
    },

    async deleteClassification(req, res) {
      const userId = req.auth.user.id
      await store.update((db) => {
        db.classifications = db.classifications.filter((item) => item.id !== req.params.id)
        db.categoryParameters = (db.categoryParameters || []).filter((item) => item.classificationId !== req.params.id)
        db.players = db.players.map((player) =>
          player.classificationId === req.params.id ? { ...player, classificationId: null, winner: false } : player,
        )
      })
      sendState(res, store, userId)
    },

    async createParameter(req, res) {
      const classificationId = String(req.body?.classificationId || '')
      const name = String(req.body?.name || '').trim()
      const maxMarks = Number(req.body?.maxMarks)
      if (!store.read().classifications.some((item) => item.id === classificationId)) {
        return fail(res, 404, 'Category not found')
      }
      if (!name) return fail(res, 400, 'Parameter name is required')
      if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
        return fail(res, 400, 'Max marks must be a whole number from 1 to 100')
      }
      const userId = req.auth.user.id
      await store.update((db) => {
        const siblings = (db.categoryParameters || []).filter((item) => item.classificationId === classificationId)
        const base = criterionKey(name)
        let key = base
        let n = 2
        while (siblings.some((item) => item.key === key)) {
          key = `${base}_${n}`
          n += 1
        }
        db.categoryParameters.push({
          id: newId('cp'),
          classificationId,
          name,
          key,
          maxMarks,
          sortOrder: Math.max(0, ...siblings.map((item) => item.sortOrder || 0)) + 1,
          active: true,
        })
      })
      sendState(res, store, userId)
    },

    async updateParameter(req, res) {
      const name = String(req.body?.name || '').trim()
      const maxMarks = Number(req.body?.maxMarks)
      if (!name) return fail(res, 400, 'Parameter name is required')
      if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
        return fail(res, 400, 'Max marks must be a whole number from 1 to 100')
      }
      const userId = req.auth.user.id
      let found = false
      await store.update((db) => {
        db.categoryParameters = (db.categoryParameters || []).map((item) => {
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
      if (!found) return fail(res, 404, 'Parameter not found')
      sendState(res, store, userId)
    },

    async deleteParameter(req, res) {
      const userId = req.auth.user.id
      await store.update((db) => {
        db.categoryParameters = (db.categoryParameters || []).filter((item) => item.id !== req.params.id)
      })
      sendState(res, store, userId)
    },
  }
}
