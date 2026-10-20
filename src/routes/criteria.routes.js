import { Router } from 'express'
import { createCriteriaController } from '../controllers/criteria.controller.js'
import { requireRole } from '../middleware/auth.js'

export function criteriaRoutes(store) {
  const router = Router()
  const criteria = createCriteriaController(store)
  const admin = requireRole('admin')

  router.post('/', admin, criteria.create)
  router.patch('/:id', admin, criteria.update)
  router.delete('/:id', admin, criteria.remove)

  return router
}
