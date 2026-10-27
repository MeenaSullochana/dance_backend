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

export function scoreAudience(score, users) {
  if (score?.audience === 'public' || score?.audience === 'judge') return score.audience
  const person = (users || []).find((user) => user.id === score?.judgeId)
  return person?.role === 'user' ? 'public' : 'judge'
}

export function splitScores(db, playerId) {
  const marks = (db.scores || []).filter((score) => score.playerId === playerId)
  const judgeScores = marks.filter((score) => scoreAudience(score, db.users) === 'judge')
  const publicScores = marks.filter((score) => scoreAudience(score, db.users) === 'public')
  const mean = (list) => (list.length ? list.reduce((sum, score) => sum + Number(score.total || 0), 0) / list.length : 0)
  return { judgeScores, publicScores, judgeAverage: mean(judgeScores), publicAverage: mean(publicScores) }
}

const PLACE_COUNT = 4

export function buildPodium(db) {
  const ranked = (db.players || [])
    .map((player) => {
      const { judgeAverage, judgeScores } = splitScores(db, player.id)
      return {
        id: player.id,
        name: player.name,
        classificationId: player.classificationId || null,
        danceStyle: player.danceStyle || player.category || '',
        avg: judgeScores.length ? judgeAverage : -1,
        count: judgeScores.length,
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.avg - a.avg || b.count - a.count || a.name.localeCompare(b.name))

  const overallId = ranked[0]?.id || null
  const categories = []
  const categoryWinnerIds = new Set()
  for (const item of (db.classifications || []).filter((row) => row.kind === 'category' && row.active !== false)) {
    const places = ranked
      .filter((row) => row.classificationId === item.id && row.id !== overallId)
      .slice(0, PLACE_COUNT)
      .map((row, index) => ({ playerId: row.id, place: index + 1, average: Number(row.avg.toFixed(1)) }))
    if (places[0]) categoryWinnerIds.add(places[0].playerId)
    categories.push({ classificationId: item.id, places })
  }

  const styles = []
  const styleNames = [...new Set(ranked.map((row) => row.danceStyle).filter(Boolean))]
  for (const danceStyle of styleNames) {
    const row = ranked.find(
      (item) => item.danceStyle === danceStyle && item.id !== overallId && !categoryWinnerIds.has(item.id),
    )
    if (row) styles.push({ danceStyle, playerId: row.id, average: Number(row.avg.toFixed(1)) })
  }

  return {
    overallId,
    overallAverage: ranked[0] ? Number(ranked[0].avg.toFixed(1)) : null,
    categories,
    styles,
  }
}

export function validateMarks(db, input, classificationId) {
  const active = criteriaForClassification(db, classificationId)
  if (!active.length) return { error: 'Add mark categories in admin first' }
  const criteria = {}
  for (const item of active) {
    const value = Number(input?.[item.key])
    if (!Number.isInteger(value) || value < 1 || value > Number(item.maxMarks)) {
      return { error: `${item.name} must be a whole number from 1 to ${item.maxMarks}` }
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
  if (!Number(state.settings.publicMaxMarks)) state.settings.publicMaxMarks = 10
}

export function publicMaxMarks(db) {
  const value = Number(db?.settings?.publicMaxMarks)
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : 10
}

export function validatePublicMark(db, input) {
  const max = publicMaxMarks(db)
  const raw = input?.overall ?? input?.mark ?? input?.total
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > max) {
    return { error: `Overall mark must be a whole number from 1 to ${max}` }
  }
  return { criteria: { overall: value }, total: value, maxTotal: max }
}
