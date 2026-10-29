import { nodeEnv } from './env.js'

function trimUrl(value, fallback = '') {
  return String(value || fallback).replace(/\/$/, '')
}

const production = nodeEnv === 'production'
export const frontendUrl = trimUrl(
  process.env.FRONTEND_URL,
  production ? 'https://dod.senatespace.in' : 'http://localhost:5173',
)
export const backendUrl = trimUrl(
  process.env.BACKEND_URL,
  production ? 'https://backdod.senatespace.in' : 'http://localhost:7000',
)
export const renderBackendUrl = trimUrl(process.env.RENDER_BACKEND_URL, 'https://dance-api.onrender.com')
export const mongoUrl = String(process.env.MONGO_URL || '').trim()
export const port = Number(process.env.PORT) || Number(new URL(backendUrl).port) || 7000
export const isProduction = production

const fromEnv = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((value) => trimUrl(value))
  .filter(Boolean)

export const corsOrigins = [
  ...new Set([
    frontendUrl,
    ...fromEnv,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://dance-site.netlify.app',
    'https://dod.senatespace.in',
  ]),
]
