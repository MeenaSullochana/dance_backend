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

export function assignArrival(db, player) {
  if (!player.classificationId) return { error: 'Add the age first so this entry is placed in a category' }
  const category = (db.classifications || []).find((item) => item.id === player.classificationId)
  const prefix = String(category?.prefix || '').trim().toUpperCase()
  if (!prefix) return { error: `Set an ID prefix for ${category?.name || 'this category'} in Classifications` }
  if (player.arrivalNo && !player.reissue) return { arrivalNo: player.arrivalNo }
  const used = (db.players || [])
    .filter((item) => item.arrivalNo && String(item.arrivalNo).toUpperCase().startsWith(`${prefix}-`))
    .map((item) => Number(String(item.arrivalNo).slice(prefix.length + 1)))
    .filter((value) => Number.isInteger(value))
  const next = (used.length ? Math.max(...used) : 0) + 1
  return { arrivalNo: `${prefix}-${String(next).padStart(2, '0')}` }
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
