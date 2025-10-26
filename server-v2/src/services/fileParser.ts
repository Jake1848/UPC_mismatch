import fs from 'fs'
import csv from 'csv-parser'
import * as XLSX from 'xlsx'

export interface ParsedRow {
  upc?: string
  sku?: string
  price?: number
  quantity?: number
  location?: string
  description?: string
  [key: string]: any
}

export class FileParser {
  async parseFile(filePath: string, fileName: string): Promise<ParsedRow[]> {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      return this.parseCSV(filePath)
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(filePath)
    } else {
      throw new Error('Unsupported file format')
    }
  }

  private parseCSV(filePath: string): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ParsedRow[] = []

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const normalized = this.normalizeRow(row)
          if (normalized.upc) {
            rows.push(normalized)
          }
        })
        .on('end', () => {
          resolve(rows)
        })
        .on('error', reject)
    })
  }

  private parseExcel(filePath: string): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      try {
        const workbook = XLSX.readFile(filePath)
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)

        const rows: ParsedRow[] = jsonData
          .map(row => this.normalizeRow(row as any))
          .filter(row => row.upc)

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    })
  }

  private normalizeRow(row: any): ParsedRow {
    const normalized: ParsedRow = {}

    // Try to find UPC in various column names
    const upcKeys = ['upc', 'UPC', 'Upc', 'barcode', 'Barcode', 'BARCODE', 'gtin', 'GTIN']
    for (const key of upcKeys) {
      if (row[key]) {
        normalized.upc = this.cleanUPC(String(row[key]))
        break
      }
    }

    // Try to find SKU
    const skuKeys = ['sku', 'SKU', 'Sku', 'item', 'Item', 'ITEM', 'product_code']
    for (const key of skuKeys) {
      if (row[key]) {
        normalized.sku = String(row[key])
        break
      }
    }

    // Try to find Price
    const priceKeys = ['price', 'Price', 'PRICE', 'cost', 'Cost', 'amount', 'Amount']
    for (const key of priceKeys) {
      if (row[key]) {
        const price = parseFloat(String(row[key]).replace(/[^0-9.-]/g, ''))
        if (!isNaN(price)) {
          normalized.price = price
        }
        break
      }
    }

    // Try to find Quantity
    const qtyKeys = ['quantity', 'Quantity', 'QUANTITY', 'qty', 'QTY', 'Qty', 'stock', 'Stock']
    for (const key of qtyKeys) {
      if (row[key]) {
        const qty = parseInt(String(row[key]))
        if (!isNaN(qty)) {
          normalized.quantity = qty
        }
        break
      }
    }

    // Try to find Location
    const locKeys = ['location', 'Location', 'LOCATION', 'warehouse', 'Warehouse', 'site', 'Site']
    for (const key of locKeys) {
      if (row[key]) {
        normalized.location = String(row[key])
        break
      }
    }

    // Try to find Description
    const descKeys = ['description', 'Description', 'DESCRIPTION', 'name', 'Name', 'title', 'Title']
    for (const key of descKeys) {
      if (row[key]) {
        normalized.description = String(row[key])
        break
      }
    }

    return normalized
  }

  private cleanUPC(upc: string): string {
    // Remove non-numeric characters
    let cleaned = upc.replace(/[^0-9]/g, '')

    // Pad to standard lengths (8, 12, 13, or 14 digits)
    if (cleaned.length < 8) {
      cleaned = cleaned.padStart(8, '0')
    } else if (cleaned.length > 8 && cleaned.length < 12) {
      cleaned = cleaned.padStart(12, '0')
    } else if (cleaned.length > 12 && cleaned.length < 13) {
      cleaned = cleaned.padStart(13, '0')
    } else if (cleaned.length > 13 && cleaned.length < 14) {
      cleaned = cleaned.padStart(14, '0')
    }

    return cleaned
  }
}
