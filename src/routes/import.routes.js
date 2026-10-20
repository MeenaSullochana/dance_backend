import { Router } from 'express'
import { createImportController } from '../controllers/import.controller.js'
import { requireRole } from '../middleware/auth.js'

export function importRoutes(store) {
  const router = Router()
  const imports = createImportController(store)

  router.post('/google-form/preview', requireRole('admin'), imports.preview)
  router.post('/google-form', requireRole('admin'), imports.importFile)

  return router
}
