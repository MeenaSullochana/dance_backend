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
export const mongoUrl = String(process.env.MONGO_URL || '').trim()
export const port = Number(process.env.PORT) || Number(new URL(backendUrl).port) || 7000
export const isProduction = production
