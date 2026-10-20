import { Router } from 'express'
import { createSettingsController } from '../controllers/settings.controller.js'
import { requireRole } from '../middleware/auth.js'

export function settingsRoutes(store) {
  const router = Router()
  const settings = createSettingsController(store)

  router.patch('/', requireRole('admin'), settings.update)

  return router
}
