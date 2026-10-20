export const PASS_PERCENT = 70

export function defaultMarkCriteria() {
  return [
    { id: 'mc1', name: 'Technique', key: 'technique', maxMarks: 10, active: true, sortOrder: 1 },
    { id: 'mc2', name: 'Expression', key: 'expression', maxMarks: 10, active: true, sortOrder: 2 },
    { id: 'mc3', name: 'Timing & Rhythm', key: 'timing', maxMarks: 10, active: true, sortOrder: 3 },
    { id: 'mc4', name: 'Costume & Stage', key: 'costume', maxMarks: 10, active: true, sortOrder: 4 },
  ]
}

export function criterionKey(name) {
  const key = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return key || 'mark'
}

export function activeMarkCriteria(db) {
  const list = (db.markCriteria || []).filter((item) => item.active !== false)
  const source = list.length ? list : defaultMarkCriteria()
  return [...source].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
}

export function criteriaForClassification(db, classificationId) {
  const own = (db.categoryParameters || []).filter(
    (item) => item.classificationId === classificationId && item.active !== false,
  )
  if (own.length) return [...own].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  return activeMarkCriteria(db)
}

export function maxTotalOf(criteria) {
  return criteria.reduce((sum, item) => sum + Number(item.maxMarks || 0), 0) || 1
}

export function scoringMetaFrom(db, classificationId) {
  const criteria = classificationId ? criteriaForClassification(db, classificationId) : activeMarkCriteria(db)
  return {
    criteria: criteria.map((item) => ({
      id: item.id,
      key: item.key,
      name: item.name,
      label: item.name,
      maxMarks: Number(item.maxMarks),
    })),
    maxTotal: maxTotalOf(criteria),
    passPercent: PASS_PERCENT,
    livePlayerId: db.settings?.livePlayerId || null,
  }
}

export function validateMarks(db, input, classificationId) {
  const active = criteriaForClassification(db, classificationId)
  if (!active.length) return { error: 'Add mark categories in admin first' }
  const criteria = {}
  for (const item of active) {
    const value = Number(input?.[item.key])
    if (!Number.isInteger(value) || value < 0 || value > Number(item.maxMarks)) {
      return { error: `${item.name} must be a whole number from 0 to ${item.maxMarks}` }
    }
    criteria[item.key] = value
  }
  const total = Object.values(criteria).reduce((sum, value) => sum + value, 0)
  return { criteria, total, maxTotal: maxTotalOf(active) }
}

export function ensureMarkCriteria(state) {
  if (!Array.isArray(state.markCriteria) || !state.markCriteria.length) {
    state.markCriteria = defaultMarkCriteria()
  }
  if (!state.settings) state.settings = { resultsPublished: false, livePlayerId: null }
  if (state.settings.livePlayerId === undefined) state.settings.livePlayerId = null
}
