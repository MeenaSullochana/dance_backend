import { Router } from 'express'
import { createPlayerController } from '../controllers/player.controller.js'
import { requireRole } from '../middleware/auth.js'

export function playerRoutes(store) {
  const router = Router()
  const players = createPlayerController(store)

  router.post('/', requireRole('admin'), players.create)
  router.patch('/:id', requireRole('admin'), players.update)
  router.delete('/:id', requireRole('admin'), players.remove)
  router.patch('/:id/winner', requireRole('admin'), players.toggleWinner)
  router.patch('/:id/live', requireRole('admin'), players.setLive)
  router.patch('/:id/voting', requireRole('admin'), players.setVoting)
  router.patch('/:id/arrive', requireRole('admin'), players.setArrived)

  return router
}
