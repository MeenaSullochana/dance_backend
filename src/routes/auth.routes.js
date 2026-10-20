import { Router } from 'express'
import { createAuthController } from '../controllers/auth.controller.js'

export function authRoutes(store) {
  const router = Router()
  const auth = createAuthController(store)

  router.post('/login', auth.login)
  router.post('/register', auth.register)
  router.post('/logout', auth.logout)

  return router
}
