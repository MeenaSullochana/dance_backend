import { Router } from 'express'
import { createTaxonomyController } from '../controllers/taxonomy.controller.js'
import { requireRole } from '../middleware/auth.js'

export function taxonomyRoutes(store) {
  const router = Router()
  const taxonomy = createTaxonomyController(store)
  const admin = requireRole('admin')

  router.post('/age-bands', admin, taxonomy.createAgeBand)
  router.patch('/age-bands/:id', admin, taxonomy.updateAgeBand)
  router.delete('/age-bands/:id', admin, taxonomy.deleteAgeBand)

  router.post('/participant-types', admin, taxonomy.createParticipantType)
  router.patch('/participant-types/:id', admin, taxonomy.updateParticipantType)
  router.delete('/participant-types/:id', admin, taxonomy.deleteParticipantType)

  router.post('/formats', admin, taxonomy.createFormat)
  router.patch('/formats/:id', admin, taxonomy.updateFormat)

  router.post('/classifications', admin, taxonomy.createClassification)
  router.patch('/classifications/:id', admin, taxonomy.updateClassification)
  router.delete('/classifications/:id', admin, taxonomy.deleteClassification)

  router.post('/category-parameters', admin, taxonomy.createParameter)
  router.patch('/category-parameters/:id', admin, taxonomy.updateParameter)
  router.delete('/category-parameters/:id', admin, taxonomy.deleteParameter)

  return router
}
