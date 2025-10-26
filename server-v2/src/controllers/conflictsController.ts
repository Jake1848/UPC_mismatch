import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
  user?: {
    userId: string
    organizationId: string
  }
}

export const getAllConflicts = async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user!
    const {
      page = '1',
      limit = '20',
      severity,
      type,
      status,
      analysisId,
      assignedToId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = { organizationId }

    if (severity) {
      const severities = (severity as string).split(',')
      where.severity = { in: severities }
    }

    if (type) {
      const types = (type as string).split(',')
      where.type = { in: types }
    }

    if (status) {
      const statuses = (status as string).split(',')
      where.status = { in: statuses }
    }

    if (analysisId) {
      where.analysisId = analysisId
    }

    if (assignedToId) {
      where.assignedToId = assignedToId === 'unassigned' ? null : assignedToId
    }

    if (search) {
      where.OR = [
        { upc: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    // Build orderBy clause
    const orderBy: any = {}
    orderBy[sortBy as string] = sortOrder

    const [conflicts, total, stats] = await Promise.all([
      prisma.conflict.findMany({
        where,
        include: {
          analysis: {
            select: {
              id: true,
              fileName: true,
              createdAt: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.conflict.count({ where }),
      // Get statistics
      prisma.conflict.groupBy({
        by: ['severity', 'status'],
        where: { organizationId },
        _count: true
      })
    ])

    // Format statistics
    const statistics = {
      bySeverity: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      },
      byStatus: {
        PENDING: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        IGNORED: 0
      }
    }

    stats.forEach(stat => {
      if (stat.severity) {
        statistics.bySeverity[stat.severity] += stat._count
      }
      if (stat.status) {
        statistics.byStatus[stat.status] += stat._count
      }
    })

    res.json({
      conflicts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      statistics
    })
  } catch (error) {
    console.error('Get conflicts error:', error)
    res.status(500).json({ error: 'Failed to fetch conflicts' })
  }
}

export const getConflictById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { organizationId } = req.user!

    const conflict = await prisma.conflict.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        analysis: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            totalRows: true,
            createdAt: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found' })
    }

    res.json({ conflict })
  } catch (error) {
    console.error('Get conflict error:', error)
    res.status(500).json({ error: 'Failed to fetch conflict' })
  }
}

export const updateConflict = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { organizationId, userId } = req.user!
    const { status, assignedToId, resolutionNotes } = req.body

    // Verify conflict belongs to organization
    const existingConflict = await prisma.conflict.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!existingConflict) {
      return res.status(404).json({ error: 'Conflict not found' })
    }

    // Build update data
    const updateData: any = {}

    if (status) {
      if (!['PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      updateData.status = status

      // If resolving, set resolvedAt timestamp
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date()
      }
    }

    if (assignedToId !== undefined) {
      // Verify assigned user belongs to same organization
      if (assignedToId) {
        const user = await prisma.user.findFirst({
          where: {
            id: assignedToId,
            organizationId
          }
        })
        if (!user) {
          return res.status(400).json({ error: 'Invalid assigned user' })
        }
      }
      updateData.assignedToId = assignedToId || null
    }

    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes
    }

    const conflict = await prisma.conflict.update({
      where: { id },
      data: updateData,
      include: {
        analysis: {
          select: {
            id: true,
            fileName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    res.json({ conflict })
  } catch (error) {
    console.error('Update conflict error:', error)
    res.status(500).json({ error: 'Failed to update conflict' })
  }
}

export const bulkUpdateConflicts = async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user!
    const { conflictIds, updates } = req.body

    if (!Array.isArray(conflictIds) || conflictIds.length === 0) {
      return res.status(400).json({ error: 'conflictIds must be a non-empty array' })
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' })
    }

    // Verify all conflicts belong to organization
    const conflicts = await prisma.conflict.findMany({
      where: {
        id: { in: conflictIds },
        organizationId
      }
    })

    if (conflicts.length !== conflictIds.length) {
      return res.status(400).json({ error: 'Some conflicts not found or unauthorized' })
    }

    // Build update data
    const updateData: any = {}

    if (updates.status) {
      if (!['PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'].includes(updates.status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      updateData.status = updates.status

      if (updates.status === 'RESOLVED') {
        updateData.resolvedAt = new Date()
      }
    }

    if (updates.assignedToId !== undefined) {
      if (updates.assignedToId) {
        const user = await prisma.user.findFirst({
          where: {
            id: updates.assignedToId,
            organizationId
          }
        })
        if (!user) {
          return res.status(400).json({ error: 'Invalid assigned user' })
        }
      }
      updateData.assignedToId = updates.assignedToId || null
    }

    // Perform bulk update
    const result = await prisma.conflict.updateMany({
      where: {
        id: { in: conflictIds }
      },
      data: updateData
    })

    res.json({
      message: `Successfully updated ${result.count} conflicts`,
      count: result.count
    })
  } catch (error) {
    console.error('Bulk update conflicts error:', error)
    res.status(500).json({ error: 'Failed to bulk update conflicts' })
  }
}

export const getConflictStats = async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user!

    const [
      totalConflicts,
      bySeverity,
      byStatus,
      byType,
      recentConflicts
    ] = await Promise.all([
      // Total count
      prisma.conflict.count({ where: { organizationId } }),

      // Group by severity
      prisma.conflict.groupBy({
        by: ['severity'],
        where: { organizationId },
        _count: true
      }),

      // Group by status
      prisma.conflict.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true
      }),

      // Group by type
      prisma.conflict.groupBy({
        by: ['type'],
        where: { organizationId },
        _count: true
      }),

      // Recent conflicts (last 7 days)
      prisma.conflict.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // Format statistics
    const statistics = {
      total: totalConflicts,
      recent: recentConflicts,
      bySeverity: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      },
      byStatus: {
        PENDING: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        IGNORED: 0
      },
      byType: {
        DUPLICATE_UPC: 0,
        INVALID_FORMAT: 0,
        MISSING_DATA: 0,
        PRICE_MISMATCH: 0,
        QUANTITY_MISMATCH: 0,
        LOCATION_CONFLICT: 0
      }
    }

    bySeverity.forEach(stat => {
      statistics.bySeverity[stat.severity] = stat._count
    })

    byStatus.forEach(stat => {
      statistics.byStatus[stat.status] = stat._count
    })

    byType.forEach(stat => {
      statistics.byType[stat.type] = stat._count
    })

    res.json({ statistics })
  } catch (error) {
    console.error('Get conflict stats error:', error)
    res.status(500).json({ error: 'Failed to fetch conflict statistics' })
  }
}
