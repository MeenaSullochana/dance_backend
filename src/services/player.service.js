import { findClassification, formatKeyToPlayerType, typeAllowsFormat } from './taxonomy.service.js'

function cleanMembers(value) {
  if (!Array.isArray(value)) return []
  return value.map((member) => String(member || '').trim()).filter(Boolean).slice(0, 200)
}

function cleanPhoto(value) {
  if (!value) return null
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return null
  if (value.length > 1_500_000) return false
  return value
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

  const participantTypeId = body?.participantTypeId || null
  const participantType = participantTypeId ? db.participantTypes.find((item) => item.id === participantTypeId) : null
  if (participantTypeId && !participantType) return { error: 'Choose a valid participant type' }
  if (participantType && !typeAllowsFormat(participantType, formatKey)) {
    return { error: `${participantType.name} cannot enter ${formatKey}` }
  }

  let classificationId = body?.classificationId || null
  if (classificationId && !db.classifications.some((item) => item.id === classificationId)) {
    return { error: 'Choose a valid classification' }
  }
  if (!classificationId && (formatKey === 'group' ? participantTypeId : age !== null)) {
    classificationId = findClassification(db, { age, participantTypeId, formatKey })?.id || null
  }

  const classification = db.classifications.find((item) => item.id === classificationId)
  const category = classification?.name || danceStyle
  const members = type === 'single' ? [] : cleanMembers(body?.members)
  const photo = cleanPhoto(body?.photo)
  if (photo === false) return { error: 'Photo is too large' }

  return {
    player: {
      name,
      type,
      formatKey,
      category,
      danceStyle,
      members,
      photo,
      age,
      email: String(body?.email || '').trim() || null,
      phone: String(body?.phone || '').trim() || null,
      club: String(body?.club || '').trim() || null,
      participantTypeId,
      classificationId,
    },
  }
}
