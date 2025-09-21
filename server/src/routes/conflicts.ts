import express from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { PrismaClient, ConflictStatus, Severity, Priority } from '@prisma/client'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { requireAnalyst, AuthenticatedRequest } from '../middleware/auth'
import { logger, logAudit } from '../utils/logger'
import { generateResolutionSuggestions } from '../services/conflictAnalysis'

const router = express.Router()
const prisma = new PrismaClient()

// Get all conflicts for organization
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']).withMessage('Invalid status'),
  query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid severity'),
  query('type').optional().isIn(['DUPLICATE_UPC', 'MULTI_UPC_PRODUCT']).withMessage('Invalid type'),
  query('assignedTo').optional().isString().withMessage('AssignedTo must be a string'),
  query('analysisId').optional().isString().withMessage('AnalysisId must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const status = req.query.status as ConflictStatus
  const severity = req.query.severity as Severity
  const type = req.query.type as string
  const assignedTo = req.query.assignedTo as string
  const analysisId = req.query.analysisId as string
  const search = req.query.search as string

  const skip = (page - 1) * limit

  // Build where clause
  const where: any = {
    organizationId: req.user!.organizationId
  }

  if (status) where.status = status
  if (severity) where.severity = severity
  if (type) where.type = type
  if (assignedTo) where.assignedToId = assignedTo
  if (analysisId) where.analysisId = analysisId

  if (search) {
    where.OR = [
      { upc: { contains: search, mode: 'insensitive' } },
      { productId: { contains: search, mode: 'insensitive' } },
      { productIds: { has: search } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [conflicts, total] = await Promise.all([
    prisma.conflict.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        analysis: {
          select: {
            id: true,
            fileName: true,
            originalName: true
          }
        }
      }
    }),
    prisma.conflict.count({ where })
  ])

  // Add resolution suggestions for each conflict
  const conflictsWithSuggestions = conflicts.map(conflict => {
    const suggestions = generateResolutionSuggestions(conflict as any)

    return {
      id: conflict.id,
      type: conflict.type,
      upc: conflict.upc,
      productId: conflict.productId,
      productIds: conflict.productIds,
      upcs: conflict.upcs,
      locations: conflict.locations,
      warehouses: conflict.warehouses,
      severity: conflict.severity,
      priority: conflict.priority,
      status: conflict.status,
      costImpact: conflict.costImpact,
      description: conflict.description,
      assignedTo: conflict.assignedTo,
      resolvedBy: conflict.resolvedBy,
      assignedAt: conflict.assignedAt,
      resolvedAt: conflict.resolvedAt,
      resolutionNotes: conflict.resolutionNotes,
      analysis: conflict.analysis,
      createdAt: conflict.createdAt,
      updatedAt: conflict.updatedAt,
      suggestions: suggestions.suggestions,
      automatable: suggestions.automatable
    }
  })

  res.json({
    conflicts: conflictsWithSuggestions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}))

// Get specific conflict
router.get('/:id', [
  param('id').isString().withMessage('Conflict ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const conflict = await prisma.conflict.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      analysis: {
        select: {
          id: true,
          fileName: true,
          originalName: true,
          totalRecords: true,
          createdAt: true
        }
      }
    }
  })

  if (!conflict) {
    throw createApiError('Conflict not found', 404)
  }

  // Get related records from analysis
  const relatedRecords = await prisma.analysisRecord.findMany({
    where: {
      analysisId: conflict.analysisId,
      OR: [
        ...(conflict.upc ? [{ upc: conflict.upc }] : []),
        ...(conflict.productId ? [{ productId: conflict.productId }] : []),
        ...(conflict.productIds ? conflict.productIds.map(id => ({ productId: id })) : [])
      ]
    },
    take: 100 // Limit to avoid huge responses
  })

  const suggestions = generateResolutionSuggestions(conflict as any)

  res.json({
    ...conflict,
    relatedRecords,
    suggestions: suggestions.suggestions,
    automatable: suggestions.automatable
  })
}))

// Assign conflict to user
router.patch('/:id/assign', requireAnalyst, [
  param('id').isString().withMessage('Conflict ID is required'),
  body('assignedToId').optional().isString().withMessage('AssignedToId must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { assignedToId } = req.body

  const conflict = await prisma.conflict.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!conflict) {
    throw createApiError('Conflict not found', 404)
  }

  // Validate assigned user if provided
  if (assignedToId) {
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        organizationId: req.user!.organizationId,
        isActive: true
      }
    })

    if (!assignedUser) {
      return res.status(400).json({
        error: 'Invalid user',
        message: 'Assigned user not found or inactive'
      })
    }
  }

  const updatedConflict = await prisma.conflict.update({
    where: { id: conflict.id },
    data: {
      assignedToId: assignedToId || null,
      assignedAt: assignedToId ? new Date() : null,
      status: assignedToId ? ConflictStatus.ASSIGNED : ConflictStatus.NEW
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  logAudit('CONFLICT_ASSIGNED', req.user!.id, req.user!.organizationId, {
    conflictId: conflict.id,
    assignedToId,
    previousAssignedToId: conflict.assignedToId
  })

  res.json({
    message: assignedToId ? 'Conflict assigned successfully' : 'Conflict unassigned successfully',
    conflict: {
      id: updatedConflict.id,
      status: updatedConflict.status,
      assignedTo: updatedConflict.assignedTo,
      assignedAt: updatedConflict.assignedAt
    }
  })
}))

// Update conflict status
router.patch('/:id/status', requireAnalyst, [
  param('id').isString().withMessage('Conflict ID is required'),
  body('status').isIn(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']).withMessage('Invalid status'),
  body('resolutionNotes').optional().isString().withMessage('Resolution notes must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { status, resolutionNotes } = req.body

  const conflict = await prisma.conflict.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!conflict) {
    throw createApiError('Conflict not found', 404)
  }

  // Validate status transition
  const validTransitions: Record<ConflictStatus, ConflictStatus[]> = {
    NEW: ['ASSIGNED', 'IN_PROGRESS', 'DISMISSED'],
    ASSIGNED: ['IN_PROGRESS', 'NEW', 'DISMISSED'],
    IN_PROGRESS: ['RESOLVED', 'ASSIGNED', 'DISMISSED'],
    RESOLVED: ['IN_PROGRESS'], // Can reopen
    DISMISSED: ['NEW'] // Can reactivate
  }

  if (!validTransitions[conflict.status].includes(status as ConflictStatus)) {
    return res.status(400).json({
      error: 'Invalid status transition',
      message: `Cannot change status from ${conflict.status} to ${status}`
    })
  }

  // Require resolution notes for resolved status
  if (status === 'RESOLVED' && !resolutionNotes) {
    return res.status(400).json({
      error: 'Resolution notes required',
      message: 'Resolution notes are required when marking a conflict as resolved'
    })
  }

  const updateData: any = {
    status: status as ConflictStatus
  }

  if (status === 'RESOLVED') {
    updateData.resolvedAt = new Date()
    updateData.resolvedById = req.user!.id
    updateData.resolutionNotes = resolutionNotes
  } else if (status === 'IN_PROGRESS' && !conflict.assignedToId) {
    // Auto-assign to current user if not assigned
    updateData.assignedToId = req.user!.id
    updateData.assignedAt = new Date()
  }

  const updatedConflict = await prisma.conflict.update({
    where: { id: conflict.id },
    data: updateData,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  logAudit('CONFLICT_STATUS_UPDATED', req.user!.id, req.user!.organizationId, {
    conflictId: conflict.id,
    oldStatus: conflict.status,
    newStatus: status,
    resolutionNotes: status === 'RESOLVED' ? resolutionNotes : undefined
  })

  res.json({
    message: 'Conflict status updated successfully',
    conflict: {
      id: updatedConflict.id,
      status: updatedConflict.status,
      assignedTo: updatedConflict.assignedTo,
      resolvedBy: updatedConflict.resolvedBy,
      resolvedAt: updatedConflict.resolvedAt,
      resolutionNotes: updatedConflict.resolutionNotes
    }
  })
}))

// Bulk assign conflicts
router.post('/bulk-assign', requireAnalyst, [
  body('conflictIds').isArray().withMessage('Conflict IDs must be an array'),
  body('conflictIds.*').isString().withMessage('Each conflict ID must be a string'),
  body('assignedToId').optional().isString().withMessage('AssignedToId must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { conflictIds, assignedToId } = req.body

  if (conflictIds.length === 0) {
    return res.status(400).json({
      error: 'No conflicts selected',
      message: 'Please select at least one conflict to assign'
    })
  }

  if (conflictIds.length > 100) {
    return res.status(400).json({
      error: 'Too many conflicts',
      message: 'Cannot assign more than 100 conflicts at once'
    })
  }

  // Validate assigned user if provided
  if (assignedToId) {
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        organizationId: req.user!.organizationId,
        isActive: true
      }
    })

    if (!assignedUser) {
      return res.status(400).json({
        error: 'Invalid user',
        message: 'Assigned user not found or inactive'
      })
    }
  }

  // Verify all conflicts belong to organization
  const conflicts = await prisma.conflict.findMany({
    where: {
      id: { in: conflictIds },
      organizationId: req.user!.organizationId
    },
    select: { id: true }
  })

  if (conflicts.length !== conflictIds.length) {
    return res.status(400).json({
      error: 'Invalid conflicts',
      message: 'Some conflicts not found or do not belong to your organization'
    })
  }

  // Bulk update
  const updateResult = await prisma.conflict.updateMany({
    where: {
      id: { in: conflictIds },
      organizationId: req.user!.organizationId
    },
    data: {
      assignedToId: assignedToId || null,
      assignedAt: assignedToId ? new Date() : null,
      status: assignedToId ? ConflictStatus.ASSIGNED : ConflictStatus.NEW
    }
  })

  logAudit('CONFLICTS_BULK_ASSIGNED', req.user!.id, req.user!.organizationId, {
    conflictIds,
    assignedToId,
    count: updateResult.count
  })

  res.json({
    message: `${updateResult.count} conflicts ${assignedToId ? 'assigned' : 'unassigned'} successfully`,
    updatedCount: updateResult.count
  })
}))

// Get conflict statistics
router.get('/stats/summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId

  const [
    totalConflicts,
    newConflicts,
    assignedConflicts,
    inProgressConflicts,
    resolvedConflicts,
    severityStats,
    typeStats
  ] = await Promise.all([
    prisma.conflict.count({
      where: { organizationId }
    }),
    prisma.conflict.count({
      where: { organizationId, status: 'NEW' }
    }),
    prisma.conflict.count({
      where: { organizationId, status: 'ASSIGNED' }
    }),
    prisma.conflict.count({
      where: { organizationId, status: 'IN_PROGRESS' }
    }),
    prisma.conflict.count({
      where: { organizationId, status: 'RESOLVED' }
    }),
    prisma.conflict.groupBy({
      by: ['severity'],
      where: { organizationId },
      _count: { severity: true }
    }),
    prisma.conflict.groupBy({
      by: ['type'],
      where: { organizationId },
      _count: { type: true }
    })
  ])

  // Calculate cost impact
  const costImpact = await prisma.conflict.aggregate({
    where: {
      organizationId,
      status: { not: 'RESOLVED' }
    },
    _sum: { costImpact: true }
  })

  res.json({
    total: totalConflicts,
    byStatus: {
      new: newConflicts,
      assigned: assignedConflicts,
      inProgress: inProgressConflicts,
      resolved: resolvedConflicts
    },
    bySeverity: severityStats.reduce((acc, stat) => {
      acc[stat.severity.toLowerCase()] = stat._count.severity
      return acc
    }, {} as Record<string, number>),
    byType: typeStats.reduce((acc, stat) => {
      acc[stat.type.toLowerCase()] = stat._count.type
      return acc
    }, {} as Record<string, number>),
    totalCostImpact: costImpact._sum.costImpact || 0,
    resolutionRate: totalConflicts > 0 ? Math.round((resolvedConflicts / totalConflicts) * 100) : 0
  })
}))

export default router