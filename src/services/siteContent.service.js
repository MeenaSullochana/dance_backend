import { hashPassword } from '../utils/passwords.js'

const PANEL_PHOTO_MAX = 4_000_000
const LEADER_PHOTO_MAX = 1_500_000
const ICONS = ['crown', 'edit', 'users', 'award']

export function defaultPanelJudges() {
  return [
    {
      id: 'pj1',
      name: 'Vicky Roshan',
      role: 'Actor · Performer · Storyteller',
      photo: null,
      imageKey: 'judgeVicky',
      sortOrder: 1,
      active: true,
    },
    {
      id: 'pj2',
      name: 'Ishwarya Balabharthy',
      role: 'Founder, NatyaTaara Dance Company',
      photo: null,
      imageKey: 'judgeIshwarya',
      sortOrder: 2,
      active: true,
    },
    {
      id: 'pj3',
      name: 'K.B. Madhusudhanan',
      role: 'Founder, Athma Academy of Dance',
      photo: null,
      imageKey: 'judgeMadhusudhanan',
      sortOrder: 3,
      active: true,
    },
    {
      id: 'pj4',
      name: 'Vandana',
      role: 'Actress · Television Star',
      photo: null,
      imageKey: 'judgeVandana',
      sortOrder: 4,
      active: true,
    },
  ]
}

export function defaultClubLeaders() {
  return [
    {
      id: 'ld1',
      name: 'Rtn. Shabeer Nazeer',
      title: 'Chairman',
      role: 'Chairman - Dance of District',
      lines: ['Rotary Year 2026-27', 'Rotary Club of Madras North'],
      photo: null,
      imageKey: 'chairman',
      icon: 'crown',
      sortOrder: 1,
      active: true,
    },
    {
      id: 'ld2',
      name: 'Rtn. Nagarajan S',
      title: 'President',
      role: 'Club President',
      lines: ['Rotary Year 2026-27', 'Rotary Club of Madras North'],
      photo: null,
      imageKey: 'president',
      icon: 'crown',
      sortOrder: 2,
      active: true,
    },
    {
      id: 'ld3',
      name: 'Rtn. Divya Subramanian',
      title: 'Secretary',
      role: 'Club Secretary',
      lines: ['Rotary Year 2026-27', 'Rotary Club of Madras North'],
      photo: null,
      imageKey: 'secretary',
      icon: 'edit',
      sortOrder: 3,
      active: true,
    },
    {
      id: 'ld4',
      name: 'Rtn. Sathish',
      title: 'Father of DOD',
      role: 'Father of Dance of District',
      lines: ['Past President Rotary year 2009-2010'],
      photo: null,
      imageKey: 'sathish',
      icon: 'crown',
      sortOrder: 4,
      active: true,
    },
    {
      id: 'ld5',
      name: 'Ann. Sunita Joseph',
      title: 'Co-Chairman',
      role: 'Co-Chairman - Dance of District',
      lines: ['Rotary Club of Madras North'],
      photo: null,
      imageKey: 'sunita',
      icon: 'users',
      sortOrder: 5,
      active: true,
    },
    {
      id: 'ld6',
      name: 'Rtn. Joseph Raja',
      title: 'Founder',
      role: 'Founder - Dance of District',
      lines: ['Past President (2013-14)', 'Rotary Club of Madras North'],
      photo: null,
      imageKey: 'josephRaja',
      icon: 'award',
      sortOrder: 6,
      active: true,
    },
  ]
}

export function defaultSitePeople() {
  return {
    panelJudges: defaultPanelJudges(),
    clubLeaders: defaultClubLeaders(),
  }
}

function panelEmail(name) {
  const slug = String(name || 'judge')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
  return `panel.${slug || 'judge'}@dance.local`
}

export function ensureSitePeople(state) {
  let changed = false
  if (!Array.isArray(state.panelJudges)) {
    state.panelJudges = []
    changed = true
  }
  if (!Array.isArray(state.clubLeaders)) {
    state.clubLeaders = []
    changed = true
  }
  if (!state.settings) state.settings = {}
  if (!state.settings.sitePeopleSeeded) {
    if (!state.panelJudges.length) state.panelJudges = defaultPanelJudges()
    if (!state.clubLeaders.length) state.clubLeaders = defaultClubLeaders()
    state.settings.sitePeopleSeeded = true
    changed = true
  }
  if (!state.settings.judgeProfilesSeeded) {
    if (!Array.isArray(state.users)) state.users = []
    const source = state.panelJudges.length ? state.panelJudges : defaultPanelJudges()
    const usedEmails = new Set(state.users.map((user) => String(user.email || '').toLowerCase()))
    for (const panel of source) {
      const existing = (state.users || []).find(
        (user) => user.role === 'judge' && user.name === panel.name,
      )
      if (existing) {
        existing.panelRole = existing.panelRole || panel.role || ''
        existing.photo = existing.photo || panel.photo || null
        existing.imageKey = existing.imageKey || panel.imageKey || null
        existing.sortOrder = existing.sortOrder || panel.sortOrder || 0
        existing.showOnPanel = true
        continue
      }
      let email = panelEmail(panel.name)
      let n = 2
      while (usedEmails.has(email)) {
        email = panelEmail(`${panel.name}${n}`)
        n += 1
      }
      usedEmails.add(email)
      state.users.push({
        id: `jp-${panel.id || panelEmail(panel.name).split('@')[0]}`,
        name: panel.name,
        email,
        passwordHash: hashPassword(`panel-${panel.id || panel.name}`),
        role: 'judge',
        active: false,
        approved: true,
        panelRole: panel.role || '',
        photo: panel.photo || null,
        imageKey: panel.imageKey || null,
        sortOrder: panel.sortOrder || 0,
        showOnPanel: true,
      })
    }
    state.settings.judgeProfilesSeeded = true
    changed = true
  }
  return changed
}

export function buildJudgeProfile(body, existing, judges) {
  const panelRole = String(body?.panelRole ?? body?.role ?? existing?.panelRole ?? '').trim()
  const sortOrder = cleanSortOrder(
    body?.sortOrder,
    existing ? existing.sortOrder || 0 : nextSortOrder(judges),
  )
  if (sortOrder?.error) return sortOrder
  const photo = Object.prototype.hasOwnProperty.call(body || {}, 'photo')
    ? cleanPhoto(body.photo, PANEL_PHOTO_MAX)
    : undefined
  if (photo === false) return { error: 'Poster is too large' }
  const showOnPanel = body?.showOnPanel === undefined ? (existing ? Boolean(existing.showOnPanel) : true) : Boolean(body.showOnPanel)
  return {
    profile: {
      panelRole,
      sortOrder,
      showOnPanel,
      imageKey: existing?.imageKey || null,
      photo: photo === undefined ? existing?.photo || null : photo,
    },
  }
}

function cleanPhoto(value, max) {
  if (value === undefined) return undefined
  if (!value) return null
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return null
  if (value.length > max) return false
  return value
}

function cleanLines(value) {
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8)
  }
  if (!Array.isArray(value)) return []
  return value
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .slice(0, 8)
}

function cleanSortOrder(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 9999) return { error: 'Sort order must be a whole number from 0 to 9999' }
  return n
}

function nextSortOrder(list) {
  return Math.max(0, ...(list || []).map((item) => item.sortOrder || 0)) + 1
}

export function buildPanelJudge(body, existing, list) {
  const name = String(body?.name || '').trim()
  if (!name) return { error: 'Name is required' }
  const role = String(body?.role || '').trim()
  const sortOrder = cleanSortOrder(body?.sortOrder, existing ? existing.sortOrder : nextSortOrder(list))
  if (sortOrder?.error) return sortOrder
  const photo = Object.prototype.hasOwnProperty.call(body || {}, 'photo')
    ? cleanPhoto(body.photo, PANEL_PHOTO_MAX)
    : undefined
  if (photo === false) return { error: 'Poster is too large' }
  const active = body?.active === undefined ? existing?.active !== false : Boolean(body.active)
  return {
    item: {
      name,
      role,
      sortOrder,
      active,
      imageKey: existing?.imageKey || null,
      photo: photo === undefined ? existing?.photo || null : photo,
    },
  }
}

export function buildClubLeader(body, existing, list) {
  const name = String(body?.name || '').trim()
  if (!name) return { error: 'Name is required' }
  const title = String(body?.title || '').trim()
  if (!title) return { error: 'Title is required' }
  const role = String(body?.role || '').trim()
  const lines = cleanLines(body?.lines)
  const icon = ICONS.includes(body?.icon) ? body.icon : existing?.icon || 'users'
  const sortOrder = cleanSortOrder(body?.sortOrder, existing ? existing.sortOrder : nextSortOrder(list))
  if (sortOrder?.error) return sortOrder
  const photo = Object.prototype.hasOwnProperty.call(body || {}, 'photo')
    ? cleanPhoto(body.photo, LEADER_PHOTO_MAX)
    : undefined
  if (photo === false) return { error: 'Photo is too large' }
  const active = body?.active === undefined ? existing?.active !== false : Boolean(body.active)
  return {
    item: {
      name,
      title,
      role,
      lines,
      icon,
      sortOrder,
      active,
      imageKey: existing?.imageKey || null,
      photo: photo === undefined ? existing?.photo || null : photo,
    },
  }
}

export function sortedPeople(list) {
  return [...(list || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name || '').localeCompare(String(b.name || '')))
}

export function moveInList(list, id, direction) {
  const ordered = sortedPeople(list)
  const index = ordered.findIndex((item) => item.id === id)
  if (index < 0) return { error: 'Item not found' }
  const next = index + (direction === 'up' ? -1 : 1)
  if (next < 0 || next >= ordered.length) return { list: ordered }
  const swapped = [...ordered]
  const current = swapped[index]
  swapped[index] = swapped[next]
  swapped[next] = current
  swapped.forEach((item, position) => {
    item.sortOrder = position + 1
  })
  return { list: swapped }
}
