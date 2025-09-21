import { logger } from '../utils/logger'

export interface ColumnMapping {
  upc?: string
  sku?: string
  warehouse?: string
  location?: string
  description?: string
  brand?: string
  category?: string
  [key: string]: string | undefined
}

export interface DetectionResult {
  mapping: ColumnMapping
  confidence: number
  suggestions: {
    column: string
    detectedAs: string
    confidence: number
    reasons: string[]
  }[]
  warnings: string[]
}

// Column detection patterns
const COLUMN_PATTERNS = {
  upc: {
    exact: [
      'upc', 'upc_code', 'upccode', 'upc-code',
      'barcode', 'bar_code', 'bar-code',
      'gtin', 'gtin14', 'gtin-14',
      'ean', 'ean13', 'ean-13',
      'product_code', 'productcode', 'product-code',
      'item_code', 'itemcode', 'item-code'
    ],
    contains: [
      'upc', 'barcode', 'gtin', 'ean', 'scan'
    ],
    patterns: [
      /^upc/i,
      /barcode/i,
      /gtin/i,
      /ean/i,
      /product.*code/i,
      /item.*code/i
    ]
  },
  sku: {
    exact: [
      'sku', 'product_id', 'productid', 'product-id',
      'item_id', 'itemid', 'item-id',
      'part_number', 'partnumber', 'part-number',
      'model', 'model_number', 'modelnumber',
      'product_number', 'productnumber'
    ],
    contains: [
      'sku', 'product', 'item', 'part', 'model'
    ],
    patterns: [
      /^sku/i,
      /product.*id/i,
      /item.*id/i,
      /part.*number/i,
      /model/i
    ]
  },
  warehouse: {
    exact: [
      'warehouse', 'warehouse_id', 'warehouseid', 'warehouse-id',
      'whse', 'whse_id', 'whseid', 'whse-id',
      'location', 'location_id', 'locationid',
      'site', 'site_id', 'siteid',
      'facility', 'facility_id', 'facilityid',
      'dc', 'dc_id', 'dcid', 'distribution_center'
    ],
    contains: [
      'warehouse', 'whse', 'site', 'facility', 'dc', 'center'
    ],
    patterns: [
      /warehouse/i,
      /whse/i,
      /site/i,
      /facility/i,
      /distribution.*center/i,
      /^dc/i
    ]
  },
  location: {
    exact: [
      'location', 'location_code', 'locationcode',
      'bin', 'bin_location', 'binlocation',
      'position', 'shelf', 'aisle',
      'zone', 'area', 'bay',
      'slot', 'pick_location', 'picklocation'
    ],
    contains: [
      'location', 'bin', 'position', 'shelf', 'aisle', 'zone', 'area'
    ],
    patterns: [
      /location/i,
      /bin/i,
      /position/i,
      /shelf/i,
      /aisle/i,
      /zone/i,
      /pick/i
    ]
  },
  description: {
    exact: [
      'description', 'desc', 'product_description',
      'name', 'product_name', 'productname',
      'title', 'item_name', 'itemname'
    ],
    contains: [
      'description', 'desc', 'name', 'title'
    ],
    patterns: [
      /description/i,
      /^desc/i,
      /name/i,
      /title/i
    ]
  },
  brand: {
    exact: [
      'brand', 'manufacturer', 'vendor', 'supplier',
      'make', 'company'
    ],
    contains: [
      'brand', 'manufacturer', 'vendor', 'supplier', 'make'
    ],
    patterns: [
      /brand/i,
      /manufacturer/i,
      /vendor/i,
      /supplier/i,
      /make/i
    ]
  },
  category: {
    exact: [
      'category', 'class', 'type', 'department',
      'group', 'family', 'segment'
    ],
    contains: [
      'category', 'class', 'type', 'department', 'group'
    ],
    patterns: [
      /category/i,
      /class/i,
      /type/i,
      /department/i,
      /group/i
    ]
  }
}

// UPC validation patterns
const UPC_PATTERNS = [
  /^\d{12}$/, // UPC-A (12 digits)
  /^\d{13}$/, // EAN-13 (13 digits)
  /^\d{14}$/, // GTIN-14 (14 digits)
  /^\d{8}$/,  // UPC-E (8 digits)
]

// SKU validation patterns (more flexible)
const SKU_PATTERNS = [
  /^[A-Z0-9\-_]{3,20}$/i,  // Alphanumeric with dashes/underscores
  /^\d{4,15}$/,             // Pure numeric
  /^[A-Z]{2,5}\d{3,10}$/i,  // Letters followed by numbers
]

// Warehouse/Location patterns
const WAREHOUSE_PATTERNS = [
  /^WH\d+$/i,              // WH01, WH02
  /^DC\d+$/i,              // DC01, DC02
  /^[A-Z]{2,4}\d{1,3}$/i,  // ABC1, MAIN2
]

const LOCATION_PATTERNS = [
  /^[A-Z]\d+-[A-Z]\d+-[A-Z]\d+$/i,  // A1-B2-C3 format
  /^[A-Z]\d+[A-Z]\d+$/i,            // A1B2 format
  /^\d+-\d+-\d+$/,                   // 1-2-3 format
  /^[A-Z]{1,2}\d{1,3}$/i,           // A12, AB123
]

export function detectColumns(headers: string[], sampleData: any[][]): DetectionResult {
  const mapping: ColumnMapping = {}
  const suggestions: DetectionResult['suggestions'] = []
  const warnings: string[] = []
  let totalConfidence = 0

  // Normalize headers for comparison
  const normalizedHeaders = headers.map(h => h.toString().toLowerCase().trim())

  // Detect each column type
  for (const [columnType, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const result = detectColumnType(columnType, normalizedHeaders, headers, sampleData)

    if (result.column) {
      mapping[columnType] = result.column
      totalConfidence += result.confidence

      suggestions.push({
        column: result.column,
        detectedAs: columnType,
        confidence: result.confidence,
        reasons: result.reasons
      })
    }
  }

  // Validate detected UPC column with sample data
  if (mapping.upc) {
    const upcValidation = validateUPCColumn(mapping.upc, headers, sampleData)
    if (!upcValidation.valid) {
      warnings.push(`UPC column '${mapping.upc}' validation warning: ${upcValidation.warning}`)
    }
  }

  // Validate detected SKU column
  if (mapping.sku) {
    const skuValidation = validateSKUColumn(mapping.sku, headers, sampleData)
    if (!skuValidation.valid) {
      warnings.push(`SKU column '${mapping.sku}' validation warning: ${skuValidation.warning}`)
    }
  }

  // Check for missing critical columns
  if (!mapping.upc) {
    warnings.push('No UPC/barcode column detected. Please manually map the UPC column.')
  }
  if (!mapping.sku) {
    warnings.push('No SKU/product ID column detected. Please manually map the product identifier column.')
  }

  // Calculate overall confidence
  const avgConfidence = suggestions.length > 0 ? totalConfidence / suggestions.length : 0

  logger.info('Column detection completed', {
    mapping,
    confidence: avgConfidence,
    warningsCount: warnings.length
  })

  return {
    mapping,
    confidence: avgConfidence,
    suggestions,
    warnings
  }
}

function detectColumnType(
  columnType: string,
  normalizedHeaders: string[],
  originalHeaders: string[],
  sampleData: any[][]
): {
  column: string | null
  confidence: number
  reasons: string[]
} {
  const patterns = COLUMN_PATTERNS[columnType as keyof typeof COLUMN_PATTERNS]
  let bestMatch: { index: number; confidence: number; reasons: string[] } | null = null

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i]
    const originalHeader = originalHeaders[i]
    const confidence = calculateColumnConfidence(header, patterns, sampleData, i)
    const reasons: string[] = []

    // Exact match gets highest confidence
    if (patterns.exact.includes(header)) {
      reasons.push('Exact header match')
      if (!bestMatch || confidence.total > bestMatch.confidence) {
        bestMatch = { index: i, confidence: confidence.total + 20, reasons }
      }
      continue
    }

    // Contains match
    const containsMatch = patterns.contains.find(pattern => header.includes(pattern))
    if (containsMatch) {
      reasons.push(`Header contains '${containsMatch}'`)
    }

    // Pattern match
    const patternMatch = patterns.patterns.find(pattern => pattern.test(header))
    if (patternMatch) {
      reasons.push(`Header matches pattern`)
    }

    // Data validation match
    if (confidence.data > 0) {
      reasons.push(`Data format matches expected pattern (${confidence.data}% valid)`)
    }

    const totalConfidence = confidence.total
    if (totalConfidence > 0 && (!bestMatch || totalConfidence > bestMatch.confidence)) {
      bestMatch = { index: i, confidence: totalConfidence, reasons }
    }
  }

  if (bestMatch && bestMatch.confidence > 30) { // Minimum confidence threshold
    return {
      column: originalHeaders[bestMatch.index],
      confidence: bestMatch.confidence,
      reasons: bestMatch.reasons
    }
  }

  return {
    column: null,
    confidence: 0,
    reasons: []
  }
}

function calculateColumnConfidence(
  header: string,
  patterns: any,
  sampleData: any[][],
  columnIndex: number
): { total: number; data: number } {
  let headerScore = 0
  let dataScore = 0

  // Header-based scoring
  if (patterns.exact.includes(header)) {
    headerScore = 80
  } else {
    // Contains scoring
    const containsMatches = patterns.contains.filter((pattern: string) => header.includes(pattern))
    headerScore += containsMatches.length * 15

    // Pattern scoring
    const patternMatches = patterns.patterns.filter((pattern: RegExp) => pattern.test(header))
    headerScore += patternMatches.length * 10
  }

  // Data-based scoring (analyze sample data)
  if (sampleData.length > 0 && columnIndex < sampleData[0].length) {
    const columnData = sampleData
      .map(row => row[columnIndex])
      .filter(value => value != null && value !== '')
      .slice(0, 100) // Analyze up to 100 samples

    if (columnData.length > 0) {
      dataScore = analyzeColumnData(columnData, patterns)
    }
  }

  return {
    total: Math.min(headerScore + dataScore, 100),
    data: dataScore
  }
}

function analyzeColumnData(data: any[], patterns: any): number {
  if (data.length === 0) return 0

  let validCount = 0
  const sampleSize = Math.min(data.length, 50)

  for (let i = 0; i < sampleSize; i++) {
    const value = String(data[i]).trim()

    // Check based on column type
    if (patterns === COLUMN_PATTERNS.upc) {
      if (UPC_PATTERNS.some(pattern => pattern.test(value))) {
        validCount++
      }
    } else if (patterns === COLUMN_PATTERNS.sku) {
      if (SKU_PATTERNS.some(pattern => pattern.test(value))) {
        validCount++
      }
    } else if (patterns === COLUMN_PATTERNS.warehouse) {
      if (WAREHOUSE_PATTERNS.some(pattern => pattern.test(value))) {
        validCount++
      }
    } else if (patterns === COLUMN_PATTERNS.location) {
      if (LOCATION_PATTERNS.some(pattern => pattern.test(value))) {
        validCount++
      }
    } else {
      // For other types, check if data looks reasonable
      if (value.length > 0 && value.length < 100) {
        validCount++
      }
    }
  }

  return Math.round((validCount / sampleSize) * 100)
}

function validateUPCColumn(
  columnName: string,
  headers: string[],
  sampleData: any[][]
): { valid: boolean; warning?: string } {
  const columnIndex = headers.indexOf(columnName)
  if (columnIndex === -1) {
    return { valid: false, warning: 'Column not found in headers' }
  }

  const columnData = sampleData
    .map(row => row[columnIndex])
    .filter(value => value != null && value !== '')
    .slice(0, 100)

  if (columnData.length === 0) {
    return { valid: false, warning: 'No data found in column' }
  }

  let validUPCs = 0
  let invalidUPCs = 0

  for (const value of columnData) {
    const strValue = String(value).trim()

    if (UPC_PATTERNS.some(pattern => pattern.test(strValue))) {
      validUPCs++
    } else {
      invalidUPCs++
    }
  }

  const validPercentage = (validUPCs / columnData.length) * 100

  if (validPercentage < 70) {
    return {
      valid: false,
      warning: `Only ${validPercentage.toFixed(1)}% of values appear to be valid UPCs`
    }
  }

  return { valid: true }
}

function validateSKUColumn(
  columnName: string,
  headers: string[],
  sampleData: any[][]
): { valid: boolean; warning?: string } {
  const columnIndex = headers.indexOf(columnName)
  if (columnIndex === -1) {
    return { valid: false, warning: 'Column not found in headers' }
  }

  const columnData = sampleData
    .map(row => row[columnIndex])
    .filter(value => value != null && value !== '')
    .slice(0, 100)

  if (columnData.length === 0) {
    return { valid: false, warning: 'No data found in column' }
  }

  // Check for reasonable SKU patterns
  let validSKUs = 0
  const skuSet = new Set()

  for (const value of columnData) {
    const strValue = String(value).trim()

    // Check for duplicates (SKUs should be unique)
    if (skuSet.has(strValue)) {
      continue // Skip duplicates for this validation
    }
    skuSet.add(strValue)

    // Validate SKU format
    if (SKU_PATTERNS.some(pattern => pattern.test(strValue)) ||
        (strValue.length >= 3 && strValue.length <= 50)) {
      validSKUs++
    }
  }

  const validPercentage = (validSKUs / skuSet.size) * 100

  if (validPercentage < 80) {
    return {
      valid: false,
      warning: `Only ${validPercentage.toFixed(1)}% of unique values appear to be valid SKUs`
    }
  }

  return { valid: true }
}

// Manual column mapping validation
export function validateColumnMapping(
  mapping: ColumnMapping,
  headers: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if mapped columns exist in headers
  for (const [type, column] of Object.entries(mapping)) {
    if (column && !headers.includes(column)) {
      errors.push(`Column '${column}' mapped as '${type}' does not exist in the file`)
    }
  }

  // Check for duplicate mappings
  const mappedColumns = Object.values(mapping).filter(Boolean)
  const uniqueColumns = new Set(mappedColumns)
  if (mappedColumns.length !== uniqueColumns.size) {
    errors.push('Multiple column types cannot be mapped to the same column')
  }

  // Check for required columns
  if (!mapping.upc) {
    errors.push('UPC column mapping is required')
  }
  if (!mapping.sku) {
    errors.push('SKU/Product ID column mapping is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Get column suggestions for manual mapping
export function getColumnSuggestions(headers: string[]): Record<string, string[]> {
  const suggestions: Record<string, string[]> = {}

  for (const [columnType, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const matches: string[] = []

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim()

      // Check exact matches first
      if (patterns.exact.includes(normalizedHeader)) {
        matches.unshift(header) // Add to beginning
        continue
      }

      // Check contains matches
      if (patterns.contains.some((pattern: string) => normalizedHeader.includes(pattern))) {
        matches.push(header)
        continue
      }

      // Check pattern matches
      if (patterns.patterns.some((pattern: RegExp) => pattern.test(normalizedHeader))) {
        matches.push(header)
      }
    }

    suggestions[columnType] = matches.slice(0, 5) // Limit to top 5 suggestions
  }

  return suggestions
}