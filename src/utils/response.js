import { present } from './present.js'

export function fail(res, status, error) {
  res.status(status).json({ error })
  return null
}

export function viewerFrom(db, userId) {
  return db.users.find((user) => user.id === userId) || null
}

export function sendState(res, store, userId) {
  res.json(present(store.read(), viewerFrom(store.read(), userId)))
}
