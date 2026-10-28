import { Router } from 'express'
import { createSettingsController } from '../controllers/settings.controller.js'
import { createStateController } from '../controllers/state.controller.js'
import { createAuthMiddleware, requireRole } from '../middleware/auth.js'
import { accountRoutes } from './accounts.routes.js'
import { appRoutes } from './app.routes.js'
import { authRoutes } from './auth.routes.js'
import { criteriaRoutes } from './criteria.routes.js'
import { importRoutes } from './import.routes.js'
import { playerRoutes } from './players.routes.js'
import { scoreRoutes } from './scores.routes.js'
import { settingsRoutes } from './settings.routes.js'
import { siteContentRoutes } from './siteContent.routes.js'
import { taxonomyRoutes } from './taxonomy.routes.js'

export function createApiRouter(store) {
  const router = Router()
  const state = createStateController(store)
  const settings = createSettingsController(store)

  router.use(createAuthMiddleware(store))

  router.get('/health', state.health)
  router.get('/state', state.getState)

  router.use('/auth', authRoutes(store))
  router.use('/app', appRoutes(store))
  router.use('/players', playerRoutes(store))
  router.use('/accounts', accountRoutes(store))
  router.use('/scores', scoreRoutes(store))
  router.use('/mark-criteria', criteriaRoutes(store))
  router.use('/settings', settingsRoutes(store))
  router.use('/import', importRoutes(store))
  router.use(siteContentRoutes(store))
  router.use(taxonomyRoutes(store))

  router.post('/reset', requireRole('admin'), settings.reset)

  return router
}
