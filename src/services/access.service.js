import { randomBytes } from 'node:crypto'
import { newId } from '../data/store.js'
import { hashPassword, verifyPassword } from '../utils/passwords.js'

export function readPhone(body) {
  const raw = String(body?.phone || body?.mobile || body?.email || '').trim()
  if (!raw) return { error: 'Enter a 10 digit mobile number' }
  if (raw.includes('@')) return { error: 'Audience login uses a mobile number only' }
  const digits = raw.replace(/\D/g, '')
  const phone = digits.length > 10 ? digits.slice(-10) : digits
  if (!/^\d{10}$/.test(phone)) return { error: 'Enter a 10 digit mobile number' }
  return { phone }
}

export function findByPhone(users, phone) {
  return (users || []).find((user) => {
    const stored = String(user.phone || '').replace(/\D/g, '')
    const value = stored.length > 10 ? stored.slice(-10) : stored
    return Boolean(value) && value === phone
  })
}

export function findStaffByEmail(users, email, password) {
  return (users || []).find(
    (user) =>
      user.email &&
      user.email.toLowerCase() === email &&
      verifyPassword(password, user.passwordHash) &&
      (user.role === 'admin' || user.role === 'judge'),
  )
}

/** Audience: one sign-in. Existing mobile opens that record; new mobile creates one. */
export async function enterAudience(store, body) {
  const id = readPhone(body)
  if (id.error) return { status: 400, error: id.error }
  const phone = id.phone
  const password = phone
  const name = String(body?.name || '').trim().slice(0, 80)
  const club = String(body?.club || '').trim().slice(0, 80) || null

  const known = findByPhone(store.read().users, phone)
  if (known) {
    if (known.active === false) return { status: 403, error: 'This account is deactivated' }
    if (known.role !== 'user') return { status: 409, error: 'This mobile number is already in use' }
  } else if (!name) {
    return { status: 400, error: 'Enter your name to sign in' }
  }

  const outcome = { status: 200 }
  await store.update((db) => {
    const existing = findByPhone(db.users, phone)
    if (existing) {
      if (existing.active === false) {
        outcome.status = 403
        outcome.error = 'This account is deactivated'
        return
      }
      if (existing.role !== 'user') {
        outcome.status = 409
        outcome.error = 'This mobile number is already in use'
        return
      }
      existing.approved = true
      if (name && !existing.name) existing.name = name
      if (club && !existing.club) existing.club = club
      const token = randomBytes(24).toString('hex')
      db.sessions[token] = existing.id
      outcome.status = 200
      outcome.token = token
      outcome.userId = existing.id
      outcome.created = false
      return
    }

    if (!name) {
      outcome.status = 400
      outcome.error = 'Enter your name to sign in'
      return
    }

    const user = {
      id: newId('u'),
      name,
      email: null,
      phone,
      club,
      passwordHash: hashPassword(password),
      role: 'user',
      active: true,
      approved: true,
      registeredAt: new Date().toISOString(),
    }
    db.users.push(user)
    const token = randomBytes(24).toString('hex')
    db.sessions[token] = user.id
    outcome.status = 201
    outcome.token = token
    outcome.userId = user.id
    outcome.created = true
  })
  return outcome
}

/** @deprecated Prefer enterAudience for website audience. Kept for app phone/email flows that still send a password. */
export function readIdentifier(body) {
  const raw = String(body?.phone || body?.mobile || body?.email || '').trim()
  if (!raw) return { error: 'Enter an email or mobile number' }
  if (raw.includes('@')) {
    const email = raw.toLowerCase()
    if (!email.includes('.')) return { error: 'Enter a valid email' }
    return { kind: 'email', email, phone: null, label: email }
  }
  const digits = raw.replace(/\D/g, '')
  const phone = digits.length > 10 ? digits.slice(-10) : digits
  if (!/^\d{10}$/.test(phone)) return { error: 'Enter a 10 digit mobile number or an email' }
  return { kind: 'phone', email: null, phone, label: phone }
}

export function findByIdentifier(users, id) {
  return (users || []).find((user) => {
    if (id.kind === 'email') return Boolean(user.email) && user.email.toLowerCase() === id.email
    const stored = String(user.phone || '').replace(/\D/g, '')
    const phone = stored.length > 10 ? stored.slice(-10) : stored
    return Boolean(phone) && phone === id.phone
  })
}

export async function enterUser(store, body) {
  const id = readIdentifier(body)
  if (id.error) return { status: 400, error: id.error }
  if (id.kind === 'phone') {
    return enterAudience(store, {
      ...body,
      phone: id.phone,
      password: id.phone,
      register: Boolean(body?.name) || body?.register === true,
    })
  }

  const password = String(body?.password || '')
  if (password.length < 4) return { status: 400, error: 'Password must be at least 4 characters' }

  const known = findByIdentifier(store.read().users, id)
  if (known) {
    if (known.active === false) return { status: 403, error: 'This account is deactivated' }
    if (!verifyPassword(password, known.passwordHash) || known.role !== 'user') {
      return { status: 409, error: 'Already registered' }
    }
  }

  const outcome = { status: 200 }
  await store.update((db) => {
    const existing = findByIdentifier(db.users, id)
    if (existing) {
      if (existing.active === false) {
        outcome.status = 403
        outcome.error = 'This account is deactivated'
        return
      }
      if (!verifyPassword(password, existing.passwordHash) || existing.role !== 'user') {
        outcome.status = 409
        outcome.error = 'Already registered'
        return
      }
      existing.approved = true
      const token = randomBytes(24).toString('hex')
      db.sessions[token] = existing.id
      outcome.status = 200
      outcome.token = token
      outcome.userId = existing.id
      outcome.created = false
      return
    }

    const user = {
      id: newId('u'),
      name: String(body?.name || '').trim().slice(0, 80) || id.label,
      email: id.email,
      phone: id.phone,
      club: String(body?.club || '').trim().slice(0, 80) || null,
      passwordHash: hashPassword(password),
      role: 'user',
      active: true,
      approved: true,
      registeredAt: new Date().toISOString(),
    }
    db.users.push(user)
    const token = randomBytes(24).toString('hex')
    db.sessions[token] = user.id
    outcome.status = 201
    outcome.token = token
    outcome.userId = user.id
    outcome.created = true
  })
  return outcome
}
