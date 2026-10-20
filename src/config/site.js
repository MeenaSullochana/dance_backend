import { nodeEnv } from './env.js'

function trimUrl(value, fallback = '') {
  return String(value || fallback).replace(/\/$/, '')
}

const production = nodeEnv === 'production'
export const frontendUrl = trimUrl(
  process.env.FRONTEND_URL,
  production ? 'https://dance-site.netlify.app' : 'http://localhost:5173',
)
export const backendUrl = trimUrl(
  process.env.BACKEND_URL,
  production ? 'https://dance-backend-3kwj.onrender.com' : 'http://localhost:4000',
)
export const mongoUrl = String(process.env.MONGO_URL || '').trim()
export const port = Number(process.env.PORT) || Number(new URL(backendUrl).port) || 4000
export const isProduction = production
