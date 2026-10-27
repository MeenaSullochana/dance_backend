export function defaultTaxonomy() {
  const ageBands = [
    { id: 'ab-tiny', name: 'Tiny Tots', minAge: 3, maxAge: 9, active: true, formatKeys: ['solo'] },
    { id: 'ab1', name: 'Kids', minAge: 10, maxAge: 14, active: true, formatKeys: ['solo'] },
    { id: 'ab-young', name: 'Young Adults', minAge: 15, maxAge: 19, active: true, formatKeys: ['solo'] },
    { id: 'ab3', name: 'Adults', minAge: 24, maxAge: 50, active: true, formatKeys: ['solo'] },
    { id: 'ab-junior', name: 'Junior', minAge: 5, maxAge: 12, active: true, formatKeys: ['couple'] },
    { id: 'ab-senior', name: 'Senior', minAge: 12, maxAge: 50, active: true, formatKeys: ['couple'] },
  ]

  const participantTypes = [
    { id: 'pt1', name: 'Rotarian', key: 'rotarian', active: true, formatKeys: ['solo', 'couple', 'group'] },
    { id: 'pt2', name: 'Ann', key: 'ann', active: true, formatKeys: ['solo', 'couple', 'group'] },
    { id: 'pt3', name: 'Annette', key: 'annette', active: true, formatKeys: ['solo', 'couple', 'group'] },
    { id: 'pt4', name: 'Rotaractor', key: 'rotaractor', active: true, formatKeys: ['group'] },
    { id: 'pt5', name: 'DPL (Inter-Club Group)', key: 'dpl', active: true, formatKeys: ['group'] },
    { id: 'pt6', name: 'Mixed', key: 'mixed', active: true, formatKeys: ['group'] },
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
      name: band.name,
      ageBandId: band.id,
      participantTypeId: null,
      formatId: 'pf1',
      price: 0,
      active: true,
      kind: 'category',
      parentId: null,
      parametersSeeded: true,
    })
  }
  for (const band of ageBands.filter((item) => item.formatKeys.includes('couple'))) {
    classifications.push({
      id: `cl-couple-${band.id}`,
      name: band.name,
      ageBandId: band.id,
      participantTypeId: null,
      formatId: 'pf2',
      price: 0,
      active: true,
      kind: 'category',
      parentId: null,
      parametersSeeded: true,
    })
  }
  classifications.push(
    {
      id: 'cl-group-pt4',
      name: 'Rotaractor',
      ageBandId: null,
      participantTypeId: 'pt4',
      formatId: 'pf3',
      price: 1500,
      active: true,
      kind: 'category',
      parentId: null,
      parametersSeeded: true,
    },
    {
      id: 'cl-group-pt5',
      name: 'DPL',
      ageBandId: null,
      participantTypeId: 'pt5',
      formatId: 'pf3',
      price: 1500,
      active: true,
      kind: 'category',
      parentId: null,
      parametersSeeded: true,
    },
    {
      id: 'cl-group-adults',
      name: 'Adults',
      ageBandId: null,
      participantTypeId: null,
      formatId: 'pf3',
      price: 1500,
      active: true,
      kind: 'category',
      parentId: null,
      parametersSeeded: true,
    },
    {
      id: 'cl-group-adults-mixed',
      name: 'Mixed',
      ageBandId: null,
      participantTypeId: 'pt6',
      formatId: 'pf3',
      price: 0,
      active: true,
      kind: 'category',
      parentId: 'cl-group-adults',
      parametersSeeded: true,
    },
    {
      id: 'cl-group-adults-ann',
      name: 'Ann',
      ageBandId: null,
      participantTypeId: 'pt2',
      formatId: 'pf3',
      price: 0,
      active: true,
      kind: 'category',
      parentId: 'cl-group-adults',
      parametersSeeded: true,
    },
    {
      id: 'cl-group-adults-annette',
      name: 'Annette',
      ageBandId: null,
      participantTypeId: 'pt3',
      formatId: 'pf3',
      price: 0,
      active: true,
      kind: 'category',
      parentId: 'cl-group-adults',
      parametersSeeded: true,
    },
  )

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

function typeKeyOf(type) {
  return String(type?.key || normalizeKey(type?.name)).replace(/\s+/g, '')
}

function formatKeysForBand(band) {
  const keys = Array.isArray(band.formatKeys)
    ? band.formatKeys.filter((key) => ['solo', 'couple', 'group'].includes(key))
    : []
  const withoutGroup = keys.filter((key) => key !== 'group')
  if (withoutGroup.length === 1) return withoutGroup
  const name = String(band.name || '').toLowerCase()
  if (name.startsWith('couple') || /\bjunior\b|\bsenior\b/.test(name)) return ['couple']
  if (name.startsWith('solo') || /tiny\s*tot|young\s*adult|\bkids?\b/.test(name)) return ['solo']
  if (withoutGroup.includes('couple') && !withoutGroup.includes('solo')) return ['couple']
  return ['solo']
}

function formatKeysForType(type) {
  const key = typeKeyOf(type)
  if (key === 'rotaractor' || key === 'dpl' || key === 'mixed' || key.includes('dpl')) return ['group']
  return ['solo', 'couple', 'group']
}

function stripFormatSuffix(name, formats) {
  let next = String(name || '').trim()
  for (const format of formats || []) {
    const suffix = ` · ${format.name}`
    if (next.endsWith(suffix)) next = next.slice(0, -suffix.length).trim()
  }
  return next
}

const PEOPLE_GROUP_TYPES = new Set(['rotarian', 'ann', 'annette', 'mixed'])

function removeClassifications(db, ids) {
  const removed = ids instanceof Set ? ids : new Set(ids || [])
  if (!removed.size) return false
  db.classifications = (db.classifications || []).filter((item) => !removed.has(item.id))
  db.categoryParameters = (db.categoryParameters || []).filter((item) => !removed.has(item.classificationId))
  db.players = (db.players || []).map((player) =>
    removed.has(player.classificationId) ? { ...player, classificationId: null, winner: false } : player,
  )
  return true
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
  const formatKeyOf = (item) => formats.find((entry) => entry.id === item.formatId)?.key

  for (const band of db.ageBands) {
    const next = formatKeysForBand(band)
    if (!Array.isArray(band.formatKeys) || band.formatKeys.join() !== next.join()) {
      band.formatKeys = next
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
    const key = typeKeyOf(type)
    if (!type.key) type.key = key
    const next = formatKeysForType(type)
    if (!Array.isArray(type.formatKeys) || !type.formatKeys.length) {
      type.formatKeys = next
      changed = true
    } else if (PEOPLE_GROUP_TYPES.has(key) || key === 'rotarian') {
      const keys = new Set(type.formatKeys)
      if (!keys.has('group')) {
        type.formatKeys = [...type.formatKeys, 'group']
        changed = true
      }
    }
  }

  const stale = new Set()
  for (const item of db.classifications || []) {
    if (item.kind !== 'category') continue
    const key = formatKeyOf(item)
    if (key === 'group' && item.ageBandId) stale.add(item.id)
    if (item.ageBandId) {
      const band = db.ageBands.find((entry) => entry.id === item.ageBandId)
      if (!band || !(band.formatKeys || []).includes(key)) stale.add(item.id)
    }
    const plain = stripFormatSuffix(item.name, formats)
    if (plain && plain !== item.name) {
      item.name = plain
      changed = true
    }
    if (item.parentId === undefined) {
      item.parentId = null
      changed = true
    }
  }
  if (removeClassifications(db, stale)) changed = true

  const solo = formatByKey('solo')
  const couple = formatByKey('couple')

  const ensureCategory = ({ id, name, format, ageBandId = null, participantTypeId = null, parentId = null, price }) => {
    if (!format) return
    let item = db.classifications.find(
      (entry) =>
        entry.kind === 'category' &&
        entry.formatId === format.id &&
        (entry.ageBandId || null) === ageBandId &&
        (entry.participantTypeId || null) === participantTypeId &&
        (entry.parentId || null) === parentId,
    )
    if (!item && participantTypeId) {
      item = db.classifications.find(
        (entry) =>
          entry.kind === 'category' &&
          entry.formatId === format.id &&
          entry.participantTypeId === participantTypeId,
      )
    }
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
        parentId,
        parametersSeeded: false,
      }
      db.classifications.push(item)
      changed = true
    }
    if (item.parentId === undefined) {
      item.parentId = parentId
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
    const plain = stripFormatSuffix(item.name, formats)
    if (plain && plain !== item.name) {
      item.name = plain
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
      name: band.name,
      format: solo,
      ageBandId: band.id,
      price: 0,
    })
  }
  for (const band of db.ageBands.filter((item) => item.active !== false && (item.formatKeys || []).includes('couple'))) {
    ensureCategory({
      id: `cl-couple-${band.id}`,
      name: band.name,
      format: couple,
      ageBandId: band.id,
      price: 0,
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
  if (text.includes('mixed')) return types.find((type) => type.key === 'mixed') || null
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

export function ageFloor(band) {
  return band?.minAge == null || band?.minAge === '' ? Number.NEGATIVE_INFINITY : Number(band.minAge)
}

export function ageCeil(band) {
  return band?.maxAge == null || band?.maxAge === '' ? Number.POSITIVE_INFINITY : Number(band.maxAge)
}

export function bandCoversAge(band, age) {
  const ageNum = Number(age)
  if (!Number.isFinite(ageNum)) return false
  return ageNum >= ageFloor(band) && ageNum <= ageCeil(band)
}

export function bandSpan(band) {
  const min = band?.minAge == null || band?.minAge === '' ? 0 : Number(band.minAge)
  const max = band?.maxAge == null || band?.maxAge === '' ? 120 : Number(band.maxAge)
  return Math.max(0, max - min)
}

/** Accept open ranges: blank from = under max, blank to = min+. */
export function parseAgeBounds(minRaw, maxRaw) {
  const read = (value) => {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    if (!Number.isInteger(number) || number < 1 || number > 120) return { error: 'Enter ages from 1 to 120, or leave blank for open ranges' }
    return number
  }
  const minAge = read(minRaw)
  if (minAge?.error) return minAge
  const maxAge = read(maxRaw)
  if (maxAge?.error) return maxAge
  if (minAge === null && maxAge === null) return { error: 'Enter a from age, a to age, or both' }
  if (minAge !== null && maxAge !== null && minAge > maxAge) return { error: 'From age cannot be greater than to age' }
  return { minAge, maxAge }
}

function narrowestBand(bands) {
  return [...bands].sort(
    (a, b) => bandSpan(a) - bandSpan(b) || ageFloor(a) - ageFloor(b),
  )[0] || null
}

export function findAgeBand(ageBands, age, formatKey) {
  if (age === null || age === undefined || !Number.isFinite(Number(age))) return null
  const ageNum = Number(age)
  const matches = (ageBands || []).filter(
    (band) => band.active !== false && bandCoversAge(band, ageNum),
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
    if (participantTypeId) {
      const byType = categories.find((item) => item.participantTypeId === participantTypeId)
      if (byType) return byType
    }
    const children = categories.filter((item) => item.parentId)
    const parents = categories.filter((item) => !item.parentId)
    const mixed = children.find((item) => /mixed/i.test(item.name))
    if (mixed) return mixed
    return (
      parents.find((item) => /adult/i.test(item.name) && !item.participantTypeId) ||
      parents.find((item) => !item.participantTypeId) ||
      null
    )
  }
  const band = findAgeBand(db.ageBands, age, formatKey)
  if (!band) return null
  return categories.find((item) => item.ageBandId === band.id) || null
}

export function classificationLabel(db, classificationId) {
  const item = db.classifications.find((entry) => entry.id === classificationId)
  return item?.name || null
}

export function buildClassificationName(db, rule) {
  if (rule.name?.trim()) return stripFormatSuffix(rule.name.trim(), db.formats)
  const band = db.ageBands.find((item) => item.id === rule.ageBandId)
  const type = db.participantTypes.find((item) => item.id === rule.participantTypeId)
  return band?.name || type?.name || 'Category'
}

export function categoryPrice(db, classificationId) {
  const item = (db.classifications || []).find((entry) => entry.id === classificationId)
  if (!item) return null
  if (item.parentId) {
    const parent = (db.classifications || []).find((entry) => entry.id === item.parentId)
    if (parent && parent.price !== undefined && parent.price !== null) return Number(parent.price)
  }
  return item.price !== undefined && item.price !== null ? Number(item.price) : null
}

export function competingCategories(classifications) {
  const list = classifications || []
  const parentIds = new Set(list.filter((item) => item.parentId).map((item) => item.parentId))
  return list.filter((item) => item.kind === 'category' && item.active !== false && !parentIds.has(item.id))
}
