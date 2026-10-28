import { Router } from 'express'
import { createSiteContentController } from '../controllers/siteContent.controller.js'
import { requireRole } from '../middleware/auth.js'

export function siteContentRoutes(store) {
  const router = Router()
  const site = createSiteContentController(store)
  const admin = requireRole('admin')

  router.post('/panel-judges', admin, site.createPanelJudge)
  router.patch('/panel-judges/:id', admin, site.updatePanelJudge)
  router.patch('/panel-judges/:id/move', admin, site.movePanelJudge)
  router.delete('/panel-judges/:id', admin, site.removePanelJudge)

  router.post('/club-leaders', admin, site.createClubLeader)
  router.patch('/club-leaders/:id', admin, site.updateClubLeader)
  router.patch('/club-leaders/:id/move', admin, site.moveClubLeader)
  router.delete('/club-leaders/:id', admin, site.removeClubLeader)

  return router
}
