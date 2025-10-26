import express from 'express'
import { query, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// Get dashboard summary statistics
router.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId

  const [
    totalAnalyses,
    totalConflicts,
    unresolvedConflicts,
    recentActivity,
    topConflictTypes,
    severityDistribution,
    monthlyTrends
  ] = await Promise.all([
    // Total analyses
    prisma.analysis.count({
      where: { organizationId }
    }),

    // Total conflicts
    prisma.conflict.count({
      where: { organizationId }
    }),

    // Unresolved conflicts
    prisma.conflict.count({
      where: {
        organizationId,
        status: { not: 'RESOLVED' }
      }
    }),

    // Recent activity (last 7 days)
    prisma.analysis.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),

    // Top conflict types
    prisma.conflict.groupBy({
      by: ['type'],
      where: { organizationId },
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } }
    }),

    // Severity distribution
    prisma.conflict.groupBy({
      by: ['severity'],
      where: { organizationId },
      _count: { severity: true }
    }),

    // Monthly trends (last 6 months)
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as analyses,
        SUM(duplicate_upcs + multi_upc_products) as conflicts
      FROM analyses
      WHERE organization_id = ${organizationId}
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `
  ])

  // Calculate resolution rate
  const resolutionRate = totalConflicts > 0
    ? Math.round(((totalConflicts - unresolvedConflicts) / totalConflicts) * 100)
    : 0

  // Format data for charts
  const conflictsByType = topConflictTypes.reduce((acc, item) => {
    acc[item.type.toLowerCase()] = item._count.type
    return acc
  }, {} as Record<string, number>)

  const conflictsBySeverity = severityDistribution.reduce((acc, item) => {
    acc[item.severity.toLowerCase()] = item._count.severity
    return acc
  }, {} as Record<string, number>)

  res.json({
    summary: {
      totalAnalyses,
      totalConflicts,
      unresolvedConflicts,
      recentActivity,
      resolutionRate
    },
    charts: {
      conflictsByType,
      conflictsBySeverity,
      monthlyTrends
    }
  })
}))

// Get conflict trends over time
router.get('/trends', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid groupBy'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const period = req.query.period as string || '30d'
  const groupBy = req.query.groupBy as string || 'day'
  const organizationId = req.user!.organizationId

  // Calculate date range
  const periodMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  }

  const days = periodMap[period as keyof typeof periodMap]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // PostgreSQL date truncation
  const truncateMap = {
    day: 'day',
    week: 'week',
    month: 'month'
  }

  const truncate = truncateMap[groupBy as keyof typeof truncateMap]

  const trends = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC(${truncate}, created_at) as period,
      COUNT(*) as total_conflicts,
      COUNT(CASE WHEN type = 'DUPLICATE_UPC' THEN 1 END) as duplicate_upcs,
      COUNT(CASE WHEN type = 'MULTI_UPC_PRODUCT' THEN 1 END) as multi_upc_products,
      COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_conflicts,
      COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_conflicts,
      COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_conflicts
    FROM conflicts
    WHERE organization_id = ${organizationId}
      AND created_at >= ${startDate}
    GROUP BY DATE_TRUNC(${truncate}, created_at)
    ORDER BY period
  ` as any[]

  res.json({
    period,
    groupBy,
    trends: trends.map(item => ({
      period: item.period,
      totalConflicts: parseInt(item.total_conflicts),
      duplicateUpcs: parseInt(item.duplicate_upcs),
      multiUpcProducts: parseInt(item.multi_upc_products),
      criticalConflicts: parseInt(item.critical_conflicts),
      highConflicts: parseInt(item.high_conflicts),
      resolvedConflicts: parseInt(item.resolved_conflicts)
    }))
  })
}))

// Get vendor scorecard (which suppliers cause most conflicts)
router.get('/vendors', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const limit = parseInt(req.query.limit as string) || 20
  const organizationId = req.user!.organizationId

  // Get vendor analysis based on UPC patterns
  const vendorData = await prisma.$queryRaw`
    WITH vendor_upcs AS (
      SELECT
        LEFT(upc, 3) as vendor_prefix,
        COUNT(DISTINCT analysis_id) as analyses_count,
        COUNT(*) as total_records
      FROM analysis_records ar
      JOIN analyses a ON ar.analysis_id = a.id
      WHERE a.organization_id = ${organizationId}
        AND LENGTH(ar.upc) >= 12
      GROUP BY LEFT(upc, 3)
    ),
    vendor_conflicts AS (
      SELECT
        LEFT(COALESCE(c.upc, ''), 3) as vendor_prefix,
        COUNT(*) as conflict_count,
        COUNT(CASE WHEN c.severity = 'CRITICAL' THEN 1 END) as critical_count,
        COUNT(CASE WHEN c.severity = 'HIGH' THEN 1 END) as high_count,
        SUM(COALESCE(c.cost_impact, 0)) as total_cost_impact
      FROM conflicts c
      WHERE c.organization_id = ${organizationId}
        AND c.upc IS NOT NULL
        AND LENGTH(c.upc) >= 12
      GROUP BY LEFT(c.upc, 3)
    )
    SELECT
      vu.vendor_prefix,
      vu.analyses_count,
      vu.total_records,
      COALESCE(vc.conflict_count, 0) as conflict_count,
      COALESCE(vc.critical_count, 0) as critical_count,
      COALESCE(vc.high_count, 0) as high_count,
      COALESCE(vc.total_cost_impact, 0) as total_cost_impact,
      CASE
        WHEN vu.total_records > 0
        THEN ROUND((COALESCE(vc.conflict_count, 0)::numeric / vu.total_records::numeric) * 100, 2)
        ELSE 0
      END as conflict_rate
    FROM vendor_upcs vu
    LEFT JOIN vendor_conflicts vc ON vu.vendor_prefix = vc.vendor_prefix
    WHERE vu.total_records >= 10
    ORDER BY conflict_rate DESC, conflict_count DESC
    LIMIT ${limit}
  ` as any[]

  // Known vendor prefix mappings (first 3 digits of UPC)
  const vendorNames: Record<string, string> = {
    '012': 'Unilever',
    '028': 'Kellogg Company',
    '034': 'Frito-Lay',
    '037': 'Procter & Gamble',
    '040': 'General Mills',
    '049': 'Coca-Cola',
    '051': 'Campbell Soup',
    '052': 'Kraft Heinz',
    '060': 'Nestlé',
    '070': 'PepsiCo'
  }

  const vendors = vendorData.map(item => ({
    vendorPrefix: item.vendor_prefix,
    vendorName: vendorNames[item.vendor_prefix] || `Vendor ${item.vendor_prefix}`,
    analysesCount: parseInt(item.analyses_count),
    totalRecords: parseInt(item.total_records),
    conflictCount: parseInt(item.conflict_count),
    criticalCount: parseInt(item.critical_count),
    highCount: parseInt(item.high_count),
    totalCostImpact: parseFloat(item.total_cost_impact),
    conflictRate: parseFloat(item.conflict_rate)
  }))

  res.json({ vendors })
}))

// Export detailed report
router.get('/export', [
  query('type').isIn(['conflicts', 'analyses', 'summary']).withMessage('Invalid export type'),
  query('format').optional().isIn(['csv', 'json']).withMessage('Invalid format'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom'),
  query('dateTo').optional().isISO8601().withMessage('Invalid dateTo'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const type = req.query.type as string
  const format = req.query.format as string || 'csv'
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date()
  const organizationId = req.user!.organizationId

  let data: any[] = []
  let filename = `upc-resolver-${type}-${new Date().toISOString().split('T')[0]}`

  switch (type) {
    case 'conflicts':
      data = await prisma.conflict.findMany({
        where: {
          organizationId,
          createdAt: { gte: dateFrom, lte: dateTo }
        },
        include: {
          analysis: { select: { fileName: true } },
          assignedTo: { select: { name: true, email: true } },
          resolvedBy: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
      break

    case 'analyses':
      data = await prisma.analysis.findMany({
        where: {
          organizationId,
          createdAt: { gte: dateFrom, lte: dateTo }
        },
        include: {
          uploadedBy: { select: { name: true, email: true } },
          _count: { select: { conflicts: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
      break

    case 'summary':
      // Generate summary report
      const [analyses, conflicts, users] = await Promise.all([
        prisma.analysis.findMany({
          where: { organizationId, createdAt: { gte: dateFrom, lte: dateTo } },
          select: { totalRecords: true, duplicateUPCs: true, multiUPCProducts: true, createdAt: true }
        }),
        prisma.conflict.findMany({
          where: { organizationId, createdAt: { gte: dateFrom, lte: dateTo } },
          select: { type: true, severity: true, status: true, costImpact: true, createdAt: true }
        }),
        prisma.user.findMany({
          where: { organizationId },
          select: { name: true, email: true, role: true, lastLoginAt: true }
        })
      ])

      data = [{
        reportPeriod: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
        totalAnalyses: analyses.length,
        totalRecordsProcessed: analyses.reduce((sum, a) => sum + (a.totalRecords || 0), 0),
        totalConflictsFound: conflicts.length,
        totalCostImpact: conflicts.reduce((sum, c) => sum + (Number(c.costImpact) || 0), 0),
        duplicateUPCs: analyses.reduce((sum, a) => sum + (a.duplicateUPCs || 0), 0),
        multiUPCProducts: analyses.reduce((sum, a) => sum + (a.multiUPCProducts || 0), 0),
        resolvedConflicts: conflicts.filter(c => c.status === 'RESOLVED').length,
        criticalConflicts: conflicts.filter(c => c.severity === 'CRITICAL').length,
        activeUsers: users.length
      }]
      break
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
    res.json(data)
  } else {
    // Convert to CSV
    const csv = convertToCSV(data)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
    res.send(csv)
  }

  logger.info('Report exported', {
    organizationId,
    type,
    format,
    recordCount: data.length
  })
}))

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')

  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  )

  return [csvHeaders, ...csvRows].join('\n')
}

export default router