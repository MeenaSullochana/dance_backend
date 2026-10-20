export function defaultTaxonomy() {
  const ageBands = [
    { id: 'ab1', name: 'Kids', minAge: 5, maxAge: 12, active: true, formatKeys: ['solo'] },
    { id: 'ab2', name: 'Teens', minAge: 13, maxAge: 17, active: true, formatKeys: ['solo'] },
    { id: 'ab3', name: 'Adults', minAge: 18, maxAge: 40, active: true, formatKeys: ['solo'] },
    { id: 'ab4', name: 'Open', minAge: 41, maxAge: 99, active: true, formatKeys: ['solo'] },
    { id: 'ab-junior', name: 'Junior', minAge: 5, maxAge: 17, active: true, formatKeys: ['couple'] },
    { id: 'ab-senior', name: 'Senior', minAge: 18, maxAge: 99, active: true, formatKeys: ['couple'] },
  ]

  const participantTypes = [
    { id: 'pt1', name: 'Rotarian', key: 'rotarian', active: true, formatKeys: ['solo', 'couple'] },
    { id: 'pt2', name: 'Ann', key: 'ann', active: true, formatKeys: ['solo', 'couple'] },
    { id: 'pt3', name: 'Annette', key: 'annette', active: true, formatKeys: ['solo', 'couple'] },
    { id: 'pt4', name: 'Rotaractor', key: 'rotaractor', active: true, formatKeys: ['group'] },
    { id: 'pt5', name: 'DPL (Inter-Club Group)', key: 'dpl', active: true, formatKeys: ['group'] },
  ]

  const formats = [
    { id: 'pf1', name: 'Solo', key: 'solo', active: true },
    { id: 'pf2', name: 'Couple', key: 'couple', active: true },
    { id: 'pf3', name: 'Group', key: 'group', active: true },
  ]

  const classifications = []
  for (const band of ageBands.filter((item) => item.formatKeys.includes('solo'))) {
    classifications.push({
      id: `cl-solo-${band.id}`,
      name: `${band.name} · Solo`,
      ageBandId: band.id,
      participantTypeId: null,
      formatId: 'pf1',
      price: 500,
      active: true,
      kind: 'category',
      parametersSeeded: true,
    })
  }
  for (const band of ageBands.filter((item) => item.formatKeys.includes('couple'))) {
    classifications.push({
      id: `cl-couple-${band.id}`,
      name: `${band.name} · Couple`,
      ageBandId: band.id,
      participantTypeId: null,
      formatId: 'pf2',
      price: 1000,
      active: true,
      kind: 'category',
      parametersSeeded: true,
    })
  }
  for (const type of participantTypes.filter((item) => item.formatKeys.includes('group'))) {
    classifications.push({
      id: `cl-group-${type.id}`,
      name: `${type.name} · Group`,
      ageBandId: null,
      participantTypeId: type.id,
      formatId: 'pf3',
      price: 1500,
      active: true,
      kind: 'category',
      parametersSeeded: true,
    })
  }

  const categoryParameters = classifications.flatMap((item) =>
    [
      ['technique', 'Technique', 10],
      ['expression', 'Expression', 10],
      ['timing', 'Timing & Rhythm', 10],
      ['costume', 'Costume & Stage', 10],
    ].map(([key, name, maxMarks], index) => ({
      id: `cp-${item.id}-${key}`,
      classificationId: item.id,
      name,
      key,
      maxMarks,
      sortOrder: index + 1,
      active: true,
    })),
  )

  return { ageBands, participantTypes, formats, classifications, categoryParameters }
}

export function ensureTaxonomy(db) {
  const seed = defaultTaxonomy()
  if (!Array.isArray(db.ageBands) || !db.ageBands.length) db.ageBands = seed.ageBands
  if (!Array.isArray(db.participantTypes) || !db.participantTypes.length) db.participantTypes = seed.participantTypes
  if (!Array.isArray(db.formats) || !db.formats.length) db.formats = seed.formats
  if (!Array.isArray(db.classifications) || !db.classifications.length) db.classifications = seed.classifications
  if (!Array.isArray(db.categoryParameters)) db.categoryParameters = []
  return db
}

const DEFAULT_FIELDS = [
  ['technique', 'Technique', 10],
  ['expression', 'Expression', 10],
  ['timing', 'Timing & Rhythm', 10],
  ['costume', 'Costume & Stage', 10],
]

function formatKeysForBand(band) {
  const name = String(band.name || '').toLowerCase()
  if (name.includes('junior') || name.includes('senior')) return ['couple']
  return ['solo']
}

function formatKeysForType(type) {
  if (type.key === 'rotaractor' || type.key === 'dpl') return ['group']
  return ['solo', 'couple']
}

function seedFields(db, classificationId) {
  DEFAULT_FIELDS.forEach(([key, name, maxMarks], index) => {
    db.categoryParameters.push({
      id: `cp-${classificationId}-${key}`,
      classificationId,
      name,
      key,
      maxMarks,
      sortOrder: index + 1,
      active: true,
    })
  })
}

export function ensureCategoryRules(db) {
  ensureTaxonomy(db)
  if (!db.settings) db.settings = { resultsPublished: false, livePlayerId: null, categoryDefaultsApplied: false }
  let changed = false
  const formats = db.formats || []
  const formatByKey = (key) => formats.find((item) => item.key === key)

  for (const band of db.ageBands) {
    if (!Array.isArray(band.formatKeys)) {
      band.formatKeys = formatKeysForBand(band)
      changed = true
    }
  }
  if (!db.settings.categoryDefaultsApplied) {
    if (!db.ageBands.some((band) => /junior/i.test(band.name))) {
      db.ageBands.push({ id: 'ab-junior', name: 'Junior', minAge: 5, maxAge: 17, active: true, formatKeys: ['couple'] })
    }
    if (!db.ageBands.some((band) => /senior/i.test(band.name))) {
      db.ageBands.push({ id: 'ab-senior', name: 'Senior', minAge: 18, maxAge: 99, active: true, formatKeys: ['couple'] })
    }
    db.settings.categoryDefaultsApplied = true
    changed = true
  }
  for (const type of db.participantTypes) {
    if (!Array.isArray(type.formatKeys)) {
      type.formatKeys = formatKeysForType(type)
      changed = true
    }
  }

  const solo = formatByKey('solo')
  const couple = formatByKey('couple')
  const group = formatByKey('group')

  const ensureCategory = ({ id, name, format, ageBandId = null, participantTypeId = null, price }) => {
    if (!format) return
    let item = db.classifications.find(
      (entry) =>
        entry.kind === 'category' &&
        entry.formatId === format.id &&
        (entry.ageBandId || null) === ageBandId &&
        (entry.participantTypeId || null) === participantTypeId,
    )
    if (!item) {
      item = {
        id,
        name,
        ageBandId,
        participantTypeId,
        formatId: format.id,
        price,
        active: true,
        kind: 'category',
        parametersSeeded: false,
      }
      db.classifications.push(item)
      changed = true
    }
    if (item.price === undefined || item.price === null) {
      item.price = price
      changed = true
    }
    if (item.kind !== 'category') {
      item.kind = 'category'
      changed = true
    }
    if (!item.parametersSeeded && !db.categoryParameters.some((field) => field.classificationId === item.id)) {
      seedFields(db, item.id)
      item.parametersSeeded = true
      changed = true
    } else if (!item.parametersSeeded) {
      item.parametersSeeded = true
      changed = true
    }
  }

  for (const band of db.ageBands.filter((item) => item.active !== false && (item.formatKeys || []).includes('solo'))) {
    ensureCategory({
      id: `cl-solo-${band.id}`,
      name: `${band.name} · Solo`,
      format: solo,
      ageBandId: band.id,
      price: 500,
    })
  }
  for (const band of db.ageBands.filter((item) => item.active !== false && (item.formatKeys || []).includes('couple'))) {
    ensureCategory({
      id: `cl-couple-${band.id}`,
      name: `${band.name} · Couple`,
      format: couple,
      ageBandId: band.id,
      price: 1000,
    })
  }
  for (const band of db.ageBands.filter((item) => item.active !== false)) {
    ensureCategory({
      id: `cl-group-age-${band.id}`,
      name: `${band.name} · Group`,
      format: group,
      ageBandId: band.id,
      price: 1500,
    })
  }
  for (const type of db.participantTypes.filter((item) => item.active !== false && (item.formatKeys || []).includes('group'))) {
    ensureCategory({
      id: `cl-group-${type.id}`,
      name: `${type.name} · Group`,
      format: group,
      participantTypeId: type.id,
      price: 1500,
    })
  }

  return changed
}

export function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function parseFormat(value) {
  const text = normalizeKey(value)
  if (text.includes('couple') || text.includes('duo')) return 'couple'
  if (text.includes('group') || text.includes('team')) return 'group'
  if (text.includes('solo') || text.includes('single')) return 'solo'
  return null
}

export function parseParticipantType(value, types) {
  const text = normalizeKey(value)
  if (!text) return null
  const exact = types.find((type) => normalizeKey(type.name) === text || type.key === text.replace(/\s+/g, ''))
  if (exact) return exact
  if (text.includes('rotaract')) return types.find((type) => type.key === 'rotaractor') || null
  if (text.includes('annette')) return types.find((type) => type.key === 'annette') || null
  if (text === 'ann' || text.startsWith('ann ')) return types.find((type) => type.key === 'ann') || null
  if (text.includes('dpl') || text.includes('inter club')) return types.find((type) => type.key === 'dpl') || null
  if (text.includes('rotarian')) return types.find((type) => type.key === 'rotarian') || null
  return types.find((type) => text.includes(normalizeKey(type.name)) || text.includes(type.key)) || null
}

export function parseAge(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const match = String(value).match(/\d{1,3}/)
  if (!match) return null
  const age = Number(match[0])
  return age >= 1 && age <= 120 ? age : null
}

export function parsePeopleCount(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const match = String(value).match(/\d{1,3}/)
  return match ? Number(match[0]) : null
}

export function parseMembers(value) {
  const text = String(value || '').trim()
  if (!text || /^n\/?a$/i.test(text) || /^na$/i.test(text) || /^nil$/i.test(text)) return []
  return text
    .split(/[,;/|]+|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 200)
}

export function formatKeyToPlayerType(formatKey) {
  if (formatKey === 'group') return 'group'
  if (formatKey === 'couple') return 'couple'
  return 'single'
}

function narrowestBand(bands) {
  return [...bands].sort(
    (a, b) => (Number(a.maxAge) - Number(a.minAge)) - (Number(b.maxAge) - Number(b.minAge)) || Number(a.minAge) - Number(b.minAge),
  )[0] || null
}

export function findAgeBand(ageBands, age, formatKey) {
  if (age === null || age === undefined || !Number.isFinite(Number(age))) return null
  const ageNum = Number(age)
  const matches = (ageBands || []).filter(
    (band) => band.active !== false && ageNum >= Number(band.minAge) && ageNum <= Number(band.maxAge),
  )
  if (formatKey) {
    const scoped = matches.filter((band) => (band.formatKeys || []).includes(formatKey))
    if (scoped.length) return narrowestBand(scoped)
    if (formatKey === 'group') return narrowestBand(matches)
  }
  return narrowestBand(matches.filter((band) => !(band.formatKeys || []).length)) || narrowestBand(matches)
}

export function typeAllowsFormat(type, formatKey) {
  if (!type || !formatKey) return true
  const keys = type.formatKeys || []
  if (!keys.length) return true
  return keys.includes(formatKey)
}

export function findClassification(db, { age, participantTypeId, formatKey }) {
  const format = (db.formats || []).find((item) => item.key === formatKey && item.active !== false)
  if (!format) return null
  const categories = (db.classifications || []).filter(
    (item) => item.active !== false && item.kind === 'category' && item.formatId === format.id,
  )
  if (formatKey === 'group') {
    const band = findAgeBand(db.ageBands, age, 'group')
    if (band) {
      const byAge = categories.find((item) => item.ageBandId === band.id)
      if (byAge) return byAge
    }
    if (!participantTypeId) return null
    return (
      categories.find((item) => item.participantTypeId === participantTypeId) ||
      (db.classifications || []).find(
        (item) => item.active !== false && item.formatId === format.id && item.participantTypeId === participantTypeId,
      ) ||
      null
    )
  }
  const band = findAgeBand(db.ageBands, age, formatKey)
  if (!band) return null
  return (
    categories.find((item) => item.ageBandId === band.id) ||
    (db.classifications || []).find(
      (item) =>
        item.active !== false &&
        item.ageBandId === band.id &&
        item.formatId === format.id &&
        (!participantTypeId || item.participantTypeId === participantTypeId),
    ) ||
    null
  )
}

export function classificationLabel(db, classificationId) {
  const item = db.classifications.find((entry) => entry.id === classificationId)
  return item?.name || null
}

export function buildClassificationName(db, rule) {
  const band = db.ageBands.find((item) => item.id === rule.ageBandId)
  const type = db.participantTypes.find((item) => item.id === rule.participantTypeId)
  const format = db.formats.find((item) => item.id === rule.formatId)
  if (rule.name?.trim()) return rule.name.trim()
  return [band?.name, format?.name, type?.name].filter(Boolean).join(' · ')
}

export function categoryPrice(db, classificationId) {
  const item = (db.classifications || []).find((entry) => entry.id === classificationId)
  return item && item.price !== undefined && item.price !== null ? Number(item.price) : null
}
