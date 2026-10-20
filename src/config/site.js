import { nodeEnv } from './env.js'

function trimUrl(value, fallback = '') {
  return String(value || fallback).replace(/\/$/, '')
}

export const frontendUrl = trimUrl(process.env.FRONTEND_URL, 'http://localhost:5173')
export const backendUrl = trimUrl(process.env.BACKEND_URL, 'http://localhost:4000')
export const mongoUrl = String(process.env.MONGO_URL || '').trim()
export const port = Number(process.env.PORT) || Number(new URL(backendUrl).port) || 4000
export const isProduction = nodeEnv === 'production'
