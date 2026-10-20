import { Router } from 'express'
import { createScoreController } from '../controllers/score.controller.js'
import { requireRole } from '../middleware/auth.js'

export function scoreRoutes(store) {
  const router = Router()
  const scores = createScoreController(store)

  router.post('/', requireRole('judge'), scores.submit)

  return router
}
