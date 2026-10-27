import { Router } from 'express'
import { createAuthController } from '../controllers/auth.controller.js'
import { asyncRoute } from '../utils/asyncRoute.js'

export function authRoutes(store) {
  const router = Router()
  const auth = createAuthController(store)

  router.post('/login', asyncRoute(auth.login))
  router.post('/register', asyncRoute(auth.register))
  router.post('/logout', asyncRoute(auth.logout))

  return router
}
