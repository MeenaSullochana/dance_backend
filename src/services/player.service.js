import { findClassification, formatKeyToPlayerType, typeAllowsFormat } from './taxonomy.service.js'

const FEE_STATUSES = ['received', 'not_received', 'doubt']

function cleanTrack(value, label) {
  if (value === '' || value === null || value === undefined) return { value: null }
  if (!FEE_STATUSES.includes(value)) return { error: `Choose the ${label}: received, not received, or doubt` }
  return { value }
}

function cleanMembers(value) {
  if (!Array.isArray(value)) return { members: [] }
  const members = []
  for (const member of value.slice(0, 200)) {
    if (typeof member === 'string') {
      const name = member.trim()
      if (name) members.push({ name, age: null })
      continue
    }
    const name = String(member?.name || '').trim()
    if (!name) continue
    const rawAge = member?.age
    const age = rawAge === '' || rawAge === null || rawAge === undefined ? null : Number(rawAge)
    if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
      return { error: `Enter a valid age for ${name}` }
    }
    members.push({ name, age })
  }
  return { members }
}

function oldestAge(age, members) {
  const listed = members.map((member) => member.age).filter((value) => Number.isInteger(value))
  if (listed.length) return Math.max(...listed)
  return Number.isInteger(age) ? age : null
}

function cleanPhoto(value) {
  if (!value) return null
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return null
  if (value.length > 1_500_000) return false
  return value
}

const ARRIVAL_LETTER = { solo: 'S', couple: 'C', group: 'G', single: 'S' }

export function playerFormatKey(player) {
  return player?.formatKey || (player?.type === 'group' ? 'group' : player?.type === 'couple' ? 'couple' : 'solo')
}

export function canGoLive(player) {
  return Boolean(player?.arrived) && player?.pendriveStatus === 'received'
}

function nextNumber(values) {
  const used = values.filter((value) => Number.isInteger(value) && value > 0)
  return (used.length ? Math.max(...used) : 0) + 1
}

function prefixNumber(value, prefix) {
  const current = String(value || '').toUpperCase()
  if (!prefix || !current.startsWith(prefix)) return null
  const n = Number(current.slice(prefix.length))
  return Number.isInteger(n) && n > 0 ? n : null
}

export function formatRegisteredId(prefix, number) {
  return `${prefix}${String(number).padStart(2, '0')}`
}

export function assignRegisteredId(db, player) {
  if (!player.classificationId) return { registeredId: player.registeredId || null }
  const category = (db.classifications || []).find((item) => item.id === player.classificationId)
  const prefix = String(category?.prefix || '').trim().toUpperCase()
  if (player.registeredId && !player.reissue) {
    if (!prefix) return { registeredId: player.registeredId }
    if (prefixNumber(player.registeredId, prefix)) return { registeredId: player.registeredId }
  }
  if (!prefix) {
    return { error: `Set a Registered ID prefix for ${category?.name || 'this category'} in Classifications (e.g. SK, SY, SA)` }
  }
  const used = (db.players || []).map((item) => {
    if (item.id && player.id && item.id === player.id) return null
    return prefixNumber(item.registeredId, prefix)
  })
  return { registeredId: formatRegisteredId(prefix, nextNumber(used)) }
}

export function assignArrival(db, player) {
  const letter = ARRIVAL_LETTER[playerFormatKey(player)] || 'S'
  if (player.arrivalNo && !player.reissue) {
    const current = String(player.arrivalNo).toUpperCase()
    if (current.startsWith(letter) && /^\d+$/.test(current.slice(1))) {
      return { arrivalNo: player.arrivalNo }
    }
  }
  const used = (db.players || []).map((item) => {
    if (item.id && player.id && item.id === player.id) return null
    if (!item.arrived) return null
    const value = String(item.arrivalNo || '').toUpperCase()
    if (!value.startsWith(letter) || !/^\d+$/.test(value.slice(1))) return null
    return Number(value.slice(1))
  })
  return { arrivalNo: `${letter}${nextNumber(used)}` }
}

export function ensureRegisteredIds(state) {
  let changed = false
  for (const player of state.players || []) {
    if (player.registeredId || !player.classificationId) continue
    const assigned = assignRegisteredId(state, { ...player, reissue: true })
    if (assigned.error || !assigned.registeredId) continue
    player.registeredId = assigned.registeredId
    changed = true
  }
  return changed
}

function arrivalMatches(value, letter) {
  const current = String(value || '').toUpperCase()
  return current.startsWith(letter) && /^\d+$/.test(current.slice(letter.length))
}

export function ensureArrivalIds(state) {
  let changed = false
  for (const player of state.players || []) {
    if (!player.arrived) continue
    const letter = ARRIVAL_LETTER[playerFormatKey(player)] || 'S'
    if (arrivalMatches(player.arrivalNo, letter)) continue
    const assigned = assignArrival(state, { ...player, arrivalNo: null, reissue: true })
    if (!assigned.arrivalNo) continue
    player.arrivalNo = assigned.arrivalNo
    changed = true
  }
  return changed
}

export function ensureLiveEligibility(state) {
  const liveId = state.settings?.livePlayerId
  if (!liveId) {
    if (!state.settings?.votingOpen) return false
    state.settings = { ...state.settings, votingOpen: false }
    return true
  }
  const player = (state.players || []).find((item) => item.id === liveId)
  if (player && canGoLive(player)) return false
  state.settings = { ...state.settings, livePlayerId: null, votingOpen: false }
  return true
}

export function buildPlayerPayload(db, body) {
  const name = String(body?.name || '').trim()
  if (!name) return { error: 'Name is required' }

  let formatKey = body?.formatKey
  if (!formatKey) {
    if (body?.type === 'group') formatKey = 'group'
    else if (body?.type === 'couple') formatKey = 'couple'
    else formatKey = 'solo'
  }
  if (!['solo', 'couple', 'group'].includes(formatKey)) return { error: 'Choose Solo, Couple, or Group' }

  const type = formatKeyToPlayerType(formatKey)
  const danceStyle = String(body?.danceStyle || body?.category || '').trim() || 'Unspecified'
  const age = body?.age === '' || body?.age === null || body?.age === undefined ? null : Number(body.age)
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return { error: 'Enter a valid age' }
  const cleanedMembers = type === 'single' ? { members: [] } : cleanMembers(body?.members)
  if (cleanedMembers.error) return { error: cleanedMembers.error }
  const members = cleanedMembers.members
  const categoryAge = type === 'single' ? age : oldestAge(age, members)

  const participantTypeId = body?.participantTypeId || null
  const participantType = participantTypeId ? db.participantTypes.find((item) => item.id === participantTypeId) : null
  if (participantTypeId && !participantType) return { error: 'Choose a valid participant type' }
  if (participantType && !typeAllowsFormat(participantType, formatKey)) {
    return { error: `${participantType.name} cannot enter ${formatKey}` }
  }

  let classificationId = null
  if (categoryAge !== null || (formatKey === 'group' && participantTypeId)) {
    classificationId = findClassification(db, { age: categoryAge, participantTypeId, formatKey })?.id || null
  }
  if (!classificationId && body?.classificationId) {
    if (!db.classifications.some((item) => item.id === body.classificationId)) {
      return { error: 'Choose a valid classification' }
    }
    classificationId = body.classificationId
  }

  const classification = db.classifications.find((item) => item.id === classificationId)
  const category = classification?.name || danceStyle
  const photo = cleanPhoto(body?.photo)
  if (photo === false) return { error: 'Photo is too large' }
  const fee = cleanTrack(body?.feeStatus, 'fee')
  if (fee.error) return { error: fee.error }
  if (!fee.value) return { error: 'Choose the fee: received, not received, or doubt' }
  const pendrive = cleanTrack(body?.pendriveStatus, 'pendrive')
  if (pendrive.error) return { error: pendrive.error }

  return {
    player: {
      name,
      type,
      formatKey,
      category,
      danceStyle,
      members,
      photo,
      age: categoryAge ?? age,
      email: String(body?.email || '').trim() || null,
      phone: String(body?.phone || '').trim() || null,
      club: String(body?.club || '').trim() || null,
      participantTypeId,
      classificationId,
      registrationStatus: 'registered',
      feeStatus: fee.value,
      pendriveStatus: pendrive.value,
    },
  }
}
