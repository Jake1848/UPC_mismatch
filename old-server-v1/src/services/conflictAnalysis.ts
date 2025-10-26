import { PrismaClient, ConflictType, Severity, Priority } from '@prisma/client'
import { logger, logPerformance } from '../utils/logger'
import { ColumnMapping } from './columnDetection'

const prisma = new PrismaClient()

export interface AnalysisRecord {
  productId: string
  warehouseId?: string
  upc: string
  location?: string
  [key: string]: any
}

export interface ConflictDetectionResult {
  duplicateUPCs: DuplicateUPCConflict[]
  multiUPCProducts: MultiUPCProductConflict[]
  statistics: {
    totalRecords: number
    uniqueUPCs: number
    uniqueProducts: number
    duplicateUPCs: number
    multiUPCProducts: number
    maxDuplication: number
  }
}

export interface DuplicateUPCConflict {
  upc: string
  productCount: number
  products: string[]
  locations: string[]
  warehouses: string[]
  severity: Severity
  costImpact?: number
}

export interface MultiUPCProductConflict {
  productId: string
  upcCount: number
  upcs: string[]
  locations: string[]
  warehouses: string[]
  severity: Severity
  costImpact?: number
}

// Severity thresholds (can be customized per organization)
const DEFAULT_SEVERITY_THRESHOLDS = {
  low: 2,
  medium: 5,
  high: 10,
  critical: 50
}

export async function analyzeConflicts(
  records: AnalysisRecord[],
  analysisId: string,
  organizationId: string,
  severityThresholds = DEFAULT_SEVERITY_THRESHOLDS
): Promise<ConflictDetectionResult> {
  const startTime = Date.now()

  logger.info('Starting conflict analysis', {
    analysisId,
    organizationId,
    recordCount: records.length
  })

  try {
    // Build UPC mapping (UPC -> Products)
    const upcMap = new Map<string, {
      products: Set<string>
      locations: Set<string>
      warehouses: Set<string>
      records: AnalysisRecord[]
    }>()

    // Build Product mapping (Product -> UPCs)
    const productMap = new Map<string, {
      upcs: Set<string>
      locations: Set<string>
      warehouses: Set<string>
      records: AnalysisRecord[]
    }>()

    // Process all records
    for (const record of records) {
      const upc = cleanUPC(record.upc)
      const productId = cleanProductId(record.productId)
      const warehouseId = record.warehouseId || 'UNKNOWN'
      const location = record.location || 'UNKNOWN'

      // Skip invalid records
      if (!upc || !productId) {
        continue
      }

      // Build UPC mapping
      if (!upcMap.has(upc)) {
        upcMap.set(upc, {
          products: new Set(),
          locations: new Set(),
          warehouses: new Set(),
          records: []
        })
      }
      const upcData = upcMap.get(upc)!
      upcData.products.add(productId)
      upcData.locations.add(location)
      upcData.warehouses.add(warehouseId)
      upcData.records.push(record)

      // Build Product mapping
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          upcs: new Set(),
          locations: new Set(),
          warehouses: new Set(),
          records: []
        })
      }
      const productData = productMap.get(productId)!
      productData.upcs.add(upc)
      productData.locations.add(location)
      productData.warehouses.add(warehouseId)
      productData.records.push(record)
    }

    // Detect duplicate UPC conflicts
    const duplicateUPCs: DuplicateUPCConflict[] = []
    for (const [upc, data] of upcMap) {
      if (data.products.size > 1) {
        const conflict: DuplicateUPCConflict = {
          upc,
          productCount: data.products.size,
          products: Array.from(data.products),
          locations: Array.from(data.locations),
          warehouses: Array.from(data.warehouses),
          severity: calculateSeverity(data.products.size, severityThresholds),
          costImpact: estimateCostImpact(data.products.size, 'duplicate_upc')
        }
        duplicateUPCs.push(conflict)
      }
    }

    // Detect multi-UPC product conflicts
    const multiUPCProducts: MultiUPCProductConflict[] = []
    for (const [productId, data] of productMap) {
      if (data.upcs.size > 1) {
        const conflict: MultiUPCProductConflict = {
          productId,
          upcCount: data.upcs.size,
          upcs: Array.from(data.upcs),
          locations: Array.from(data.locations),
          warehouses: Array.from(data.warehouses),
          severity: calculateSeverity(data.upcs.size, severityThresholds),
          costImpact: estimateCostImpact(data.upcs.size, 'multi_upc_product')
        }
        multiUPCProducts.push(conflict)
      }
    }

    // Calculate statistics
    const statistics = {
      totalRecords: records.length,
      uniqueUPCs: upcMap.size,
      uniqueProducts: productMap.size,
      duplicateUPCs: duplicateUPCs.length,
      multiUPCProducts: multiUPCProducts.length,
      maxDuplication: Math.max(
        ...Array.from(upcMap.values()).map(d => d.products.size),
        ...Array.from(productMap.values()).map(d => d.upcs.size)
      )
    }

    // Sort conflicts by severity and impact
    duplicateUPCs.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return b.productCount - a.productCount
    })

    multiUPCProducts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return b.upcCount - a.upcCount
    })

    const duration = Date.now() - startTime
    logPerformance('Conflict analysis', duration, {
      analysisId,
      recordCount: records.length,
      conflictsFound: duplicateUPCs.length + multiUPCProducts.length
    })

    logger.info('Conflict analysis completed', {
      analysisId,
      statistics,
      duration: `${duration}ms`
    })

    return {
      duplicateUPCs,
      multiUPCProducts,
      statistics
    }
  } catch (error) {
    logger.error('Conflict analysis failed:', error)
    throw new Error('Failed to analyze conflicts')
  }
}

export async function saveConflictsToDatabase(
  conflicts: ConflictDetectionResult,
  analysisId: string,
  organizationId: string
): Promise<void> {
  const startTime = Date.now()

  try {
    await prisma.$transaction(async (tx) => {
      // Save duplicate UPC conflicts
      for (const conflict of conflicts.duplicateUPCs) {
        await tx.conflict.create({
          data: {
            type: ConflictType.DUPLICATE_UPC,
            upc: conflict.upc,
            productIds: conflict.products,
            upcs: [conflict.upc],
            locations: conflict.locations,
            warehouses: conflict.warehouses,
            severity: conflict.severity,
            priority: calculatePriority(conflict.severity),
            status: 'NEW',
            costImpact: conflict.costImpact,
            description: `UPC ${conflict.upc} is assigned to ${conflict.productCount} different products: ${conflict.products.slice(0, 3).join(', ')}${conflict.products.length > 3 ? '...' : ''}`,
            analysisId,
            organizationId
          }
        })
      }

      // Save multi-UPC product conflicts
      for (const conflict of conflicts.multiUPCProducts) {
        await tx.conflict.create({
          data: {
            type: ConflictType.MULTI_UPC_PRODUCT,
            productId: conflict.productId,
            productIds: [conflict.productId],
            upcs: conflict.upcs,
            locations: conflict.locations,
            warehouses: conflict.warehouses,
            severity: conflict.severity,
            priority: calculatePriority(conflict.severity),
            status: 'NEW',
            costImpact: conflict.costImpact,
            description: `Product ${conflict.productId} has ${conflict.upcCount} different UPCs: ${conflict.upcs.slice(0, 3).join(', ')}${conflict.upcs.length > 3 ? '...' : ''}`,
            analysisId,
            organizationId
          }
        })
      }
    })

    const duration = Date.now() - startTime
    logPerformance('Save conflicts to database', duration, {
      analysisId,
      conflictCount: conflicts.duplicateUPCs.length + conflicts.multiUPCProducts.length
    })

    logger.info('Conflicts saved to database', {
      analysisId,
      duplicateUPCs: conflicts.duplicateUPCs.length,
      multiUPCProducts: conflicts.multiUPCProducts.length,
      duration: `${duration}ms`
    })
  } catch (error) {
    logger.error('Failed to save conflicts to database:', error)
    throw new Error('Failed to save conflicts to database')
  }
}

function cleanUPC(upc: any): string | null {
  if (!upc) return null

  const cleaned = String(upc).trim().replace(/[^\d]/g, '') // Remove non-digits

  // Validate UPC length
  if (cleaned.length < 8 || cleaned.length > 14) {
    return null
  }

  // Pad with leading zeros if needed (for UPC-A)
  if (cleaned.length === 11) {
    return '0' + cleaned
  }

  return cleaned
}

function cleanProductId(productId: any): string | null {
  if (!productId) return null

  const cleaned = String(productId).trim()

  // Basic validation
  if (cleaned.length === 0 || cleaned.length > 100) {
    return null
  }

  return cleaned
}

function calculateSeverity(count: number, thresholds = DEFAULT_SEVERITY_THRESHOLDS): Severity {
  if (count >= thresholds.critical) return Severity.CRITICAL
  if (count >= thresholds.high) return Severity.HIGH
  if (count >= thresholds.medium) return Severity.MEDIUM
  return Severity.LOW
}

function calculatePriority(severity: Severity): Priority {
  switch (severity) {
    case Severity.CRITICAL:
      return Priority.URGENT
    case Severity.HIGH:
      return Priority.HIGH
    case Severity.MEDIUM:
      return Priority.MEDIUM
    case Severity.LOW:
      return Priority.LOW
    default:
      return Priority.MEDIUM
  }
}

function estimateCostImpact(conflictSize: number, conflictType: 'duplicate_upc' | 'multi_upc_product'): number {
  // Base cost per conflict (can be customized per organization)
  const baseCosts = {
    duplicate_upc: 100, // Cost per product affected
    multi_upc_product: 50 // Cost per UPC affected
  }

  const baseCost = baseCosts[conflictType]

  // Calculate exponential cost increase for larger conflicts
  const multiplier = Math.pow(1.5, Math.min(conflictSize - 2, 10)) // Cap exponential growth

  return Math.round(baseCost * conflictSize * multiplier)
}

// Advanced conflict detection patterns
export function detectComplexConflicts(records: AnalysisRecord[]): {
  similarUPCs: Array<{ upcs: string[]; similarity: number }>
  suspiciousPatterns: Array<{ pattern: string; records: AnalysisRecord[] }>
} {
  const similarUPCs: Array<{ upcs: string[]; similarity: number }> = []
  const suspiciousPatterns: Array<{ pattern: string; records: AnalysisRecord[] }> = []

  // Group UPCs by first N digits to find similar patterns
  const upcGroups = new Map<string, string[]>()

  for (const record of records) {
    const upc = cleanUPC(record.upc)
    if (!upc) continue

    // Group by first 8 digits
    const prefix = upc.substring(0, Math.min(8, upc.length))
    if (!upcGroups.has(prefix)) {
      upcGroups.set(prefix, [])
    }
    upcGroups.get(prefix)!.push(upc)
  }

  // Find groups with multiple similar UPCs
  for (const [prefix, upcs] of upcGroups) {
    const uniqueUPCs = Array.from(new Set(upcs))
    if (uniqueUPCs.length > 1 && uniqueUPCs.length <= 10) {
      similarUPCs.push({
        upcs: uniqueUPCs,
        similarity: calculateUPCSimilarity(uniqueUPCs)
      })
    }
  }

  // Detect suspicious patterns
  // Pattern 1: Sequential UPCs assigned to the same product
  const productUPCs = new Map<string, string[]>()
  for (const record of records) {
    const upc = cleanUPC(record.upc)
    const productId = cleanProductId(record.productId)
    if (!upc || !productId) continue

    if (!productUPCs.has(productId)) {
      productUPCs.set(productId, [])
    }
    productUPCs.get(productId)!.push(upc)
  }

  for (const [productId, upcs] of productUPCs) {
    const uniqueUPCs = Array.from(new Set(upcs)).sort()
    if (uniqueUPCs.length > 1) {
      const sequential = checkSequentialUPCs(uniqueUPCs)
      if (sequential) {
        suspiciousPatterns.push({
          pattern: `Sequential UPCs for product ${productId}`,
          records: records.filter(r => cleanProductId(r.productId) === productId)
        })
      }
    }
  }

  return { similarUPCs, suspiciousPatterns }
}

function calculateUPCSimilarity(upcs: string[]): number {
  if (upcs.length < 2) return 0

  let totalSimilarity = 0
  let comparisons = 0

  for (let i = 0; i < upcs.length; i++) {
    for (let j = i + 1; j < upcs.length; j++) {
      const similarity = calculateStringSimilarity(upcs[i], upcs[j])
      totalSimilarity += similarity
      comparisons++
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1

  let matches = 0
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      matches++
    }
  }

  return matches / maxLength
}

function checkSequentialUPCs(upcs: string[]): boolean {
  if (upcs.length < 3) return false

  const numericUPCs = upcs
    .map(upc => parseInt(upc, 10))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b)

  if (numericUPCs.length < 3) return false

  // Check if at least 3 UPCs are sequential
  for (let i = 0; i < numericUPCs.length - 2; i++) {
    if (numericUPCs[i + 1] === numericUPCs[i] + 1 &&
        numericUPCs[i + 2] === numericUPCs[i] + 2) {
      return true
    }
  }

  return false
}

// Generate conflict resolution suggestions
export function generateResolutionSuggestions(conflict: DuplicateUPCConflict | MultiUPCProductConflict): {
  suggestions: string[]
  automatable: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
} {
  const suggestions: string[] = []
  let automatable = false
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'

  if ('productCount' in conflict) {
    // Duplicate UPC conflict
    suggestions.push('Verify if products are actually different or variations of the same item')
    suggestions.push('Check if UPC was incorrectly assigned to multiple products')
    suggestions.push('Consider creating unique UPCs for each product variant')

    if (conflict.productCount === 2) {
      suggestions.push('Review product descriptions to identify if one is a duplicate entry')
      automatable = true
    }

    priority = conflict.severity.toLowerCase() as any
  } else {
    // Multi-UPC product conflict
    suggestions.push('Verify if multiple UPCs are legitimate (different package sizes, etc.)')
    suggestions.push('Check if some UPCs are outdated and should be removed')
    suggestions.push('Consider consolidating to a single primary UPC')

    if (conflict.upcCount === 2) {
      suggestions.push('Compare UPC usage frequency to identify the primary UPC')
      automatable = true
    }

    priority = conflict.severity.toLowerCase() as any
  }

  return { suggestions, automatable, priority }
}