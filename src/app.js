import cors from 'cors'
import express from 'express'
import { connectMongo } from './config/db.js'
import { frontendUrl } from './config/site.js'
import { createStore } from './data/store.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createApiRouter } from './routes/index.js'

export async function createApp() {
  await connectMongo()
  const store = await createStore()

  const app = express()
  app.use(cors({ origin: frontendUrl }))
  app.use(express.json({ limit: '12mb' }))
  app.use('/api', createApiRouter(store))
  app.use(errorHandler)

  return app
}
