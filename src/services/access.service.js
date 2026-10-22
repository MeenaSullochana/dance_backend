import { randomBytes } from 'node:crypto'
import { newId } from '../data/store.js'
import { hashPassword, verifyPassword } from '../utils/passwords.js'

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
  const password = String(body?.password || '')
  if (password.length < 4) return { status: 400, error: 'Password must be at least 4 characters' }
  const id = readIdentifier(body)
  if (id.error) return { status: 400, error: id.error }

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
