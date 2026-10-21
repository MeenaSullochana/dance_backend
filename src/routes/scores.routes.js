import { Router } from 'express'
import { createScoreController } from '../controllers/score.controller.js'
import { requireRole } from '../middleware/auth.js'

export function scoreRoutes(store) {
  const router = Router()
  const scores = createScoreController(store)

  router.post('/winners', requireRole('admin'), scores.findWinners)
  router.post('/', requireRole('judge', 'user'), scores.submit)

  return router
}
