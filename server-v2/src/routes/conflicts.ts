import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getAllConflicts,
  getConflictById,
  updateConflict,
  bulkUpdateConflicts,
  getConflictStats
} from '../controllers/conflictsController'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get conflict statistics
router.get('/stats', getConflictStats)

// Get all conflicts for organization (with filtering)
router.get('/', getAllConflicts)

// Get single conflict
router.get('/:id', getConflictById)

// Update single conflict
router.patch('/:id', updateConflict)

// Bulk update conflicts
router.post('/bulk-update', bulkUpdateConflicts)

export default router
