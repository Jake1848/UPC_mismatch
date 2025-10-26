import { ParsedRow } from './fileParser'

export interface DetectedConflict {
  upc: string
  type: 'DUPLICATE_UPC' | 'INVALID_FORMAT' | 'MISSING_DATA' | 'PRICE_MISMATCH' | 'QUANTITY_MISMATCH' | 'LOCATION_CONFLICT'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  suggestedFix?: string
  relatedRows?: number[]
}

export class ConflictDetector {
  detectConflicts(rows: ParsedRow[]): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []

    // Track UPCs we've seen
    const upcMap = new Map<string, ParsedRow[]>()

    // First pass: collect all rows by UPC
    rows.forEach((row, index) => {
      if (row.upc) {
        if (!upcMap.has(row.upc)) {
          upcMap.set(row.upc, [])
        }
        upcMap.get(row.upc)!.push({ ...row, rowIndex: index })
      }
    })

    // Second pass: detect conflicts
    upcMap.forEach((rowsWithSameUPC, upc) => {
      // Check for duplicate UPCs
      if (rowsWithSameUPC.length > 1) {
        conflicts.push(...this.detectDuplicateConflicts(upc, rowsWithSameUPC))
      }

      // Check each row for other issues
      rowsWithSameUPC.forEach(row => {
        conflicts.push(...this.detectRowIssues(upc, row))
      })
    })

    return conflicts
  }

  private detectDuplicateConflicts(upc: string, rows: any[]): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []

    // Check for price mismatches
    const prices = rows.map(r => r.price).filter(p => p !== undefined)
    if (prices.length > 1) {
      const uniquePrices = [...new Set(prices)]
      if (uniquePrices.length > 1) {
        conflicts.push({
          upc,
          type: 'PRICE_MISMATCH',
          severity: this.calculateSeverity('PRICE_MISMATCH', uniquePrices),
          description: `UPC ${upc} has ${uniquePrices.length} different prices: ${uniquePrices.map(p => `$${p}`).join(', ')}`,
          suggestedFix: `Standardize price to $${Math.min(...uniquePrices)} (lowest) or $${Math.max(...uniquePrices)} (highest)`,
          relatedRows: rows.map(r => r.rowIndex)
        })
      }
    }

    // Check for quantity mismatches in same location
    const locationGroups = new Map<string, any[]>()
    rows.forEach(row => {
      const loc = row.location || 'UNKNOWN'
      if (!locationGroups.has(loc)) {
        locationGroups.set(loc, [])
      }
      locationGroups.get(loc)!.push(row)
    })

    locationGroups.forEach((locationRows, location) => {
      if (locationRows.length > 1) {
        conflicts.push({
          upc,
          type: 'DUPLICATE_UPC',
          severity: 'HIGH',
          description: `UPC ${upc} appears ${locationRows.length} times in location "${location}"`,
          suggestedFix: `Consolidate entries or verify if multiple items with same UPC exist`,
          relatedRows: locationRows.map(r => r.rowIndex)
        })
      }
    })

    // Check for location conflicts
    const locations = rows.map(r => r.location).filter(l => l)
    if (locations.length > 1) {
      const uniqueLocations = [...new Set(locations)]
      if (uniqueLocations.length > 1) {
        conflicts.push({
          upc,
          type: 'LOCATION_CONFLICT',
          severity: 'MEDIUM',
          description: `UPC ${upc} found in ${uniqueLocations.length} different locations: ${uniqueLocations.join(', ')}`,
          suggestedFix: `Verify if item should exist in multiple locations or consolidate`,
          relatedRows: rows.map(r => r.rowIndex)
        })
      }
    }

    return conflicts
  }

  private detectRowIssues(upc: string, row: any): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []

    // Check UPC format
    if (!this.isValidUPC(upc)) {
      conflicts.push({
        upc,
        type: 'INVALID_FORMAT',
        severity: 'HIGH',
        description: `UPC ${upc} has invalid format (expected 8, 12, 13, or 14 digits)`,
        suggestedFix: `Verify UPC format and add check digits if missing`,
        relatedRows: [row.rowIndex]
      })
    }

    // Check for missing critical data
    const missingFields: string[] = []
    if (!row.price) missingFields.push('price')
    if (!row.quantity) missingFields.push('quantity')
    if (!row.location) missingFields.push('location')

    if (missingFields.length > 0) {
      conflicts.push({
        upc,
        type: 'MISSING_DATA',
        severity: this.calculateMissingDataSeverity(missingFields),
        description: `UPC ${upc} missing: ${missingFields.join(', ')}`,
        suggestedFix: `Add missing fields or remove incomplete entry`,
        relatedRows: [row.rowIndex]
      })
    }

    // Check for suspicious quantities
    if (row.quantity !== undefined) {
      if (row.quantity < 0) {
        conflicts.push({
          upc,
          type: 'QUANTITY_MISMATCH',
          severity: 'HIGH',
          description: `UPC ${upc} has negative quantity: ${row.quantity}`,
          suggestedFix: `Verify quantity or mark as returned/damaged items`,
          relatedRows: [row.rowIndex]
        })
      } else if (row.quantity === 0) {
        conflicts.push({
          upc,
          type: 'QUANTITY_MISMATCH',
          severity: 'LOW',
          description: `UPC ${upc} has zero quantity`,
          suggestedFix: `Update quantity or remove if out of stock`,
          relatedRows: [row.rowIndex]
        })
      }
    }

    // Check for suspicious prices
    if (row.price !== undefined) {
      if (row.price <= 0) {
        conflicts.push({
          upc,
          type: 'PRICE_MISMATCH',
          severity: 'HIGH',
          description: `UPC ${upc} has invalid price: $${row.price}`,
          suggestedFix: `Set correct price or mark as free item`,
          relatedRows: [row.rowIndex]
        })
      } else if (row.price > 100000) {
        conflicts.push({
          upc,
          type: 'PRICE_MISMATCH',
          severity: 'MEDIUM',
          description: `UPC ${upc} has unusually high price: $${row.price}`,
          suggestedFix: `Verify price is correct (potential decimal error)`,
          relatedRows: [row.rowIndex]
        })
      }
    }

    return conflicts
  }

  private isValidUPC(upc: string): boolean {
    // UPC should be 8, 12, 13, or 14 digits
    const validLengths = [8, 12, 13, 14]
    return /^\d+$/.test(upc) && validLengths.includes(upc.length)
  }

  private calculateSeverity(type: string, prices: number[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (type === 'PRICE_MISMATCH') {
      const maxDiff = Math.max(...prices) - Math.min(...prices)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

      const diffPercent = (maxDiff / avgPrice) * 100

      if (diffPercent > 50) return 'CRITICAL'
      if (diffPercent > 25) return 'HIGH'
      if (diffPercent > 10) return 'MEDIUM'
      return 'LOW'
    }

    return 'MEDIUM'
  }

  private calculateMissingDataSeverity(fields: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (fields.includes('price') && fields.includes('quantity')) return 'CRITICAL'
    if (fields.includes('price')) return 'HIGH'
    if (fields.includes('quantity')) return 'MEDIUM'
    return 'LOW'
  }
}
