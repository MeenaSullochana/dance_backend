import cors from 'cors'
import express from 'express'
import { connectMongo } from './config/db.js'
import { corsOrigins } from './config/site.js'
import { createStore } from './data/store.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createApiRouter } from './routes/index.js'

export async function createApp() {
  await connectMongo()
  const store = await createStore()

  const app = express()
  const allowed = new Set(corsOrigins)
  const localDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowed.has(origin) || localDev.test(origin)) return callback(null, true)
        return callback(null, false)
      },
    }),
  )
  app.use(express.json({ limit: '12mb' }))
  app.use('/api', createApiRouter(store))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' })
  })
  app.use(errorHandler)

  return app
}
