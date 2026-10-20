import * as XLSX from 'xlsx'
import {
  findAgeBand,
  findClassification,
  formatKeyToPlayerType,
  normalizeKey,
  parseAge,
  parseFormat,
  parseMembers,
  parseParticipantType,
  parsePeopleCount,
} from './taxonomy.service.js'

const HEADER_ALIASES = {
  email: ['email', 'email address'],
  name: ['participant name', 'name', 'full name'],
  phone: ['contact number', 'phone', 'mobile', 'contact'],
  club: ['rotary club name', 'club name', 'rotary club'],
  participantType: ['participant type', 'type'],
  danceCategory: ['category of dance', 'category of dance 2', 'dance category'],
  people: ['number of people dancing', 'number of people dancing 2', 'no of people dancing', 'participants count'],
  members: [
    'names of other participants',
    'names of all group participants',
    'names of all group pa',
    'other participants',
    'group members',
  ],
  danceStyle: ['dance style / genre', 'dance style / genre 2', 'dance style / genre 3', 'dance style', 'genre'],
  age: ['age', 'participant age', 'age (years)'],
  payment: ['payment screenshot', 'payment proof'],
  timestamp: ['timestamp'],
}

function headerKey(header) {
  return normalizeKey(header).replace(/\s+/g, ' ')
}

function mapHeaders(headers) {
  const map = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((header) => aliases.includes(headerKey(header)))
    if (index >= 0) map[field] = index
  }
  return map
}

function cell(row, map, field) {
  const index = map[field]
  if (index === undefined) return ''
  const value = row[index]
  return value === undefined || value === null ? '' : value
}

export function parseGoogleFormWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  if (!rows.length) return { headers: [], rows: [] }
  const headers = rows[0].map((value) => String(value || '').trim())
  const map = mapHeaders(headers)
  const dataRows = rows.slice(1).filter((row) => row.some((value) => String(value || '').trim()))
  return { headers, map, rows: dataRows }
}

export function previewGoogleFormRows(db, buffer) {
  const { map, rows } = parseGoogleFormWorkbook(buffer)
  if (map.name === undefined && map.email === undefined) {
    throw new Error('Could not find Participant Name or Email columns. Upload the Google Form responses Excel/CSV.')
  }

  return rows.map((row, index) => {
    const name = String(cell(row, map, 'name') || '').trim()
    const email = String(cell(row, map, 'email') || '').trim()
    const phone = String(cell(row, map, 'phone') || '').trim()
    const club = String(cell(row, map, 'club') || '').trim()
    const age = parseAge(cell(row, map, 'age'))
    const danceCategoryRaw = String(cell(row, map, 'danceCategory') || '').trim()
    const participantRaw = String(cell(row, map, 'participantType') || '').trim()
    const danceStyle = String(cell(row, map, 'danceStyle') || '').trim() || 'Unspecified'
    const people = parsePeopleCount(cell(row, map, 'people'))
    const members = parseMembers(cell(row, map, 'members'))
    const paymentUrl = String(cell(row, map, 'payment') || '').trim()
    const formatKey = parseFormat(danceCategoryRaw) || (people === 1 ? 'solo' : people === 2 ? 'couple' : people >= 3 ? 'group' : null)
    const participantType = parseParticipantType(participantRaw, db.participantTypes)
    const ageBand = findAgeBand(db.ageBands, age, formatKey)
    const classification = findClassification(db, {
      age,
      participantTypeId: participantType?.id,
      formatKey,
    })
    const warnings = []
    if (!name) warnings.push('Missing participant name')
    if (!formatKey) warnings.push('Could not detect Solo / Couple / Group')
    if (!participantType) warnings.push('Participant type not matched')
    if (formatKey && formatKey !== 'group' && age === null) warnings.push('Age missing — add Age column in the form or edit after import')
    else if (formatKey && formatKey !== 'group' && age !== null && !ageBand) warnings.push(`No ${formatKey} age category covers age ${age}`)
    if (participantType && formatKey && !(participantType.formatKeys || []).includes(formatKey)) {
      warnings.push(`${participantType.name} is not allowed in ${formatKey}`)
    }
    if (formatKey && !classification) warnings.push('No category for this entry')
    if (participantType && formatKey && !(participantType.formatKeys || []).includes(formatKey) && participantType.key === 'rotaractor') {
      warnings.push('Rotaractors can only register in Group')
    }

    const duplicate = db.players.some(
      (player) =>
        (email && player.email && player.email.toLowerCase() === email.toLowerCase() && player.name.toLowerCase() === name.toLowerCase()) ||
        (name && player.name.toLowerCase() === name.toLowerCase() && player.phone && phone && player.phone === phone),
    )
    if (duplicate) warnings.push('Looks like an existing player (will skip on import)')

    return {
      row: index + 2,
      name,
      email,
      phone,
      club,
      age,
      ageBand: ageBand?.name || null,
      participantType: participantType?.name || participantRaw || null,
      participantTypeId: participantType?.id || null,
      formatKey,
      format: formatKey ? formatKey[0].toUpperCase() + formatKey.slice(1) : null,
      danceStyle,
      people,
      members,
      paymentUrl,
      classificationId: classification?.id || null,
      classification: classification?.name || null,
      type: formatKeyToPlayerType(formatKey),
      category: classification?.name || danceStyle,
      warnings,
      ok: Boolean(name && formatKey && !duplicate),
    }
  })
}

export function rowsToPlayers(previewRows, startChest) {
  let chestNo = startChest
  return previewRows
    .filter((row) => row.ok)
    .map((row) => {
      chestNo += 1
      return {
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        club: row.club || null,
        age: row.age,
        participantTypeId: row.participantTypeId,
        formatKey: row.formatKey,
        classificationId: row.classificationId,
        type: row.type,
        category: row.category,
        danceStyle: row.danceStyle,
        members: row.type === 'single' ? [] : row.members,
        peopleCount: row.people,
        paymentUrl: row.paymentUrl || null,
        photo: null,
        chestNo,
        winner: false,
        source: 'google-form',
        registrationStatus: 'registered',
        feeStatus: 'received',
        arrived: false,
        arrivalNo: null,
      }
    })
}
