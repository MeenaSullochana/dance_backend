import { Router } from 'express'
import { createAppController } from '../controllers/app.controller.js'
import { requireRole } from '../middleware/auth.js'

export function appRoutes(store) {
  const router = Router()
  const app = createAppController(store)

  router.post('/auth/login', app.login)
  router.post('/auth/register', app.register)
  router.post('/auth/logout', app.logout)
  router.get('/me', requireRole('judge', 'user'), app.me)

  router.get('/judge/home', requireRole('judge'), app.judgeHome)
  router.get('/judge/players/:id', requireRole('judge'), app.judgePlayer)
  router.post('/judge/scores', requireRole('judge'), app.judgeScore)

  router.get('/user/home', requireRole('user'), app.userHome)
  router.get('/user/players/:id', requireRole('user'), app.userPlayer)
  router.post('/user/scores', requireRole('user'), app.userScore)

  return router
}
