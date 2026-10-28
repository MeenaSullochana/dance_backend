import { Router } from 'express'
import { createAccountController } from '../controllers/account.controller.js'
import { requireRole } from '../middleware/auth.js'

export function accountRoutes(store) {
  const router = Router()
  const accounts = createAccountController(store)

  router.post('/', requireRole('admin'), accounts.create)
  router.patch('/:id/approve', requireRole('admin'), accounts.approve)
  router.patch('/:id/toggle', requireRole('admin'), accounts.toggle)
  router.patch('/:id/move', requireRole('admin'), accounts.move)
  router.patch('/:id', requireRole('admin'), accounts.update)
  router.delete('/:id', requireRole('admin'), accounts.remove)

  return router
}
