import XLSX from 'xlsx'
import csv from 'csv-parser'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { logger } from '../utils/logger'
import { detectFileType } from './fileUpload'

export interface ProcessedFileData {
  headers: string[]
  records: any[][]
  metadata: {
    totalRows: number
    totalColumns: number
    fileType: string
    encoding?: string
    hasHeaders: boolean
  }
}

export async function processUploadedFile(filePath: string): Promise<ProcessedFileData> {
  const fileType = await detectFileType(filePath)

  logger.info('Processing uploaded file', {
    filePath,
    detectedType: fileType.type
  })

  switch (fileType.type) {
    case 'excel':
      return processExcelFile(filePath)
    case 'csv':
      return processCsvFile(filePath)
    case 'tsv':
      return processTsvFile(filePath)
    case 'json':
      return processJsonFile(filePath)
    default:
      throw new Error(`Unsupported file type: ${fileType.type}`)
  }
}

async function processExcelFile(filePath: string): Promise<ProcessedFileData> {
  try {
    const buffer = await fs.readFile(filePath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Use the first sheet
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Convert to array of arrays
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

    // Filter out completely empty rows
    const filteredData = rawData.filter(row =>
      row.some(cell => cell !== '' && cell != null)
    )

    if (filteredData.length === 0) {
      throw new Error('Excel file contains no data')
    }

    // Detect headers
    const hasHeaders = detectHeaders(filteredData[0])
    const headers = hasHeaders
      ? filteredData[0].map((h, i) => String(h || `Column ${i + 1}`))
      : filteredData[0].map((_, i) => `Column ${i + 1}`)

    const records = hasHeaders ? filteredData.slice(1) : filteredData

    return {
      headers,
      records,
      metadata: {
        totalRows: records.length,
        totalColumns: headers.length,
        fileType: 'excel',
        hasHeaders
      }
    }
  } catch (error) {
    logger.error('Error processing Excel file:', error)
    throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processCsvFile(filePath: string): Promise<ProcessedFileData> {
  return new Promise((resolve, reject) => {
    const records: any[][] = []
    let headers: string[] = []
    let isFirstRow = true

    createReadStream(filePath)
      .pipe(csv({ headers: false, skipEmptyLines: true }))
      .on('data', (data) => {
        const row = Object.values(data) as string[]

        if (isFirstRow) {
          const hasHeaders = detectHeaders(row)
          if (hasHeaders) {
            headers = row.map((h, i) => String(h || `Column ${i + 1}`))
          } else {
            headers = row.map((_, i) => `Column ${i + 1}`)
            records.push(row)
          }
          isFirstRow = false
        } else {
          records.push(row)
        }
      })
      .on('end', () => {
        if (records.length === 0 && headers.length === 0) {
          reject(new Error('CSV file contains no data'))
          return
        }

        resolve({
          headers,
          records,
          metadata: {
            totalRows: records.length,
            totalColumns: headers.length,
            fileType: 'csv',
            hasHeaders: !isFirstRow,
            encoding: 'utf8'
          }
        })
      })
      .on('error', (error) => {
        logger.error('Error processing CSV file:', error)
        reject(new Error(`Failed to process CSV file: ${error.message}`))
      })
  })
}

async function processTsvFile(filePath: string): Promise<ProcessedFileData> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length === 0) {
      throw new Error('TSV file contains no data')
    }

    const rawData = lines.map(line => line.split('\t'))

    // Detect headers
    const hasHeaders = detectHeaders(rawData[0])
    const headers = hasHeaders
      ? rawData[0].map((h, i) => String(h || `Column ${i + 1}`))
      : rawData[0].map((_, i) => `Column ${i + 1}`)

    const records = hasHeaders ? rawData.slice(1) : rawData

    return {
      headers,
      records,
      metadata: {
        totalRows: records.length,
        totalColumns: headers.length,
        fileType: 'tsv',
        hasHeaders,
        encoding: 'utf8'
      }
    }
  } catch (error) {
    logger.error('Error processing TSV file:', error)
    throw new Error(`Failed to process TSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processJsonFile(filePath: string): Promise<ProcessedFileData> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const jsonData = JSON.parse(content)

    if (!Array.isArray(jsonData)) {
      throw new Error('JSON file must contain an array of objects')
    }

    if (jsonData.length === 0) {
      throw new Error('JSON file contains no data')
    }

    // Extract headers from first object
    const firstObject = jsonData[0]
    if (typeof firstObject !== 'object' || firstObject === null) {
      throw new Error('JSON array must contain objects')
    }

    const headers = Object.keys(firstObject)

    // Convert objects to arrays
    const records = jsonData.map(obj =>
      headers.map(header => obj[header] ?? '')
    )

    return {
      headers,
      records,
      metadata: {
        totalRows: records.length,
        totalColumns: headers.length,
        fileType: 'json',
        hasHeaders: true,
        encoding: 'utf8'
      }
    }
  } catch (error) {
    logger.error('Error processing JSON file:', error)
    throw new Error(`Failed to process JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function detectHeaders(firstRow: any[]): boolean {
  if (!firstRow || firstRow.length === 0) return false

  // Check if first row contains text that looks like column headers
  const textCount = firstRow.filter(cell => {
    const str = String(cell).trim()
    return str.length > 0 && isNaN(Number(str))
  }).length

  // If more than 50% of cells contain non-numeric text, likely headers
  return textCount > firstRow.length * 0.5
}

// Validate processed data
export function validateProcessedData(data: ProcessedFileData): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check minimum requirements
  if (data.headers.length === 0) {
    errors.push('No columns detected in the file')
  }

  if (data.records.length === 0) {
    errors.push('No data rows found in the file')
  }

  // Check for reasonable data size
  if (data.records.length > 10000000) {
    errors.push('File contains too many rows (maximum 10 million supported)')
  }

  if (data.headers.length > 1000) {
    warnings.push('File contains many columns which may slow processing')
  }

  // Check for empty columns
  const emptyColumns = data.headers.filter((_, index) => {
    return data.records.every(row =>
      !row[index] || String(row[index]).trim() === ''
    )
  })

  if (emptyColumns.length > 0) {
    warnings.push(`${emptyColumns.length} columns appear to be empty: ${emptyColumns.slice(0, 3).join(', ')}${emptyColumns.length > 3 ? '...' : ''}`)
  }

  // Check data consistency
  const inconsistentRows = data.records.filter(row =>
    row.length !== data.headers.length
  ).length

  if (inconsistentRows > 0) {
    warnings.push(`${inconsistentRows} rows have inconsistent column counts`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Convert processed data to analysis records
export function convertToAnalysisRecords(
  data: ProcessedFileData,
  columnMapping: { upc: string; sku: string; warehouse?: string; location?: string }
): Array<{
  productId: string
  warehouseId?: string
  upc: string
  location?: string
  rawData: any
}> {
  const upcIndex = data.headers.indexOf(columnMapping.upc)
  const skuIndex = data.headers.indexOf(columnMapping.sku)
  const warehouseIndex = columnMapping.warehouse ? data.headers.indexOf(columnMapping.warehouse) : -1
  const locationIndex = columnMapping.location ? data.headers.indexOf(columnMapping.location) : -1

  if (upcIndex === -1) {
    throw new Error(`UPC column '${columnMapping.upc}' not found`)
  }
  if (skuIndex === -1) {
    throw new Error(`SKU column '${columnMapping.sku}' not found`)
  }

  return data.records
    .map((row, index) => {
      const upc = String(row[upcIndex] || '').trim()
      const productId = String(row[skuIndex] || '').trim()

      // Skip rows with missing critical data
      if (!upc || !productId) {
        return null
      }

      const warehouseId = warehouseIndex >= 0 ? String(row[warehouseIndex] || '').trim() : undefined
      const location = locationIndex >= 0 ? String(row[locationIndex] || '').trim() : undefined

      // Create raw data object
      const rawData: any = {}
      data.headers.forEach((header, i) => {
        rawData[header] = row[i]
      })
      rawData._rowIndex = index + 1

      return {
        productId,
        warehouseId,
        upc,
        location,
        rawData
      }
    })
    .filter(record => record !== null) as Array<{
      productId: string
      warehouseId?: string
      upc: string
      location?: string
      rawData: any
    }>
}

// Stream processing for large files
export async function streamProcessLargeFile(
  filePath: string,
  batchSize: number = 1000,
  onBatch: (batch: any[], batchIndex: number) => Promise<void>
): Promise<number> {
  const data = await processUploadedFile(filePath)
  let totalProcessed = 0

  for (let i = 0; i < data.records.length; i += batchSize) {
    const batch = data.records.slice(i, i + batchSize)
    await onBatch(batch, Math.floor(i / batchSize))
    totalProcessed += batch.length

    // Log progress for large files
    if (data.records.length > 10000) {
      const progress = Math.round((totalProcessed / data.records.length) * 100)
      logger.info(`Processing progress: ${progress}% (${totalProcessed}/${data.records.length} rows)`)
    }
  }

  return totalProcessed
}