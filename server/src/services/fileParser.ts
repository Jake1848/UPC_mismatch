import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '../utils/logger';

export interface ParsedFileData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  fileType: string;
  preview: Record<string, any>[];
}

export class FileParserService {
  private static readonly PREVIEW_ROWS = 10;
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Parse any supported file format and return structured data
   */
  static async parseFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ParsedFileData> {
    const fileSize = fileBuffer.length;
    
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    logger.info(`Parsing file: ${fileName} (${mimeType})`);

    const fileType = this.detectFileType(fileName, mimeType);

    switch (fileType) {
      case 'csv':
        return this.parseCSV(fileBuffer);
      case 'excel':
        return this.parseExcel(fileBuffer);
      case 'json':
        return this.parseJSON(fileBuffer);
      case 'xml':
        return this.parseXML(fileBuffer);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Detect file type from filename and MIME type
   */
  private static detectFileType(fileName: string, mimeType: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Check by extension first
    if (extension === 'csv') return 'csv';
    if (extension === 'xlsx' || extension === 'xls') return 'excel';
    if (extension === 'json') return 'json';
    if (extension === 'xml') return 'xml';

    // Check by MIME type
    if (mimeType.includes('csv')) return 'csv';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
    if (mimeType.includes('json')) return 'json';
    if (mimeType.includes('xml')) return 'xml';

    throw new Error('Unable to detect file type');
  }

  /**
   * Parse CSV file
   */
  private static parseCSV(fileBuffer: Buffer): ParsedFileData {
    const csvString = fileBuffer.toString('utf-8');

    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          const rows = results.data as Record<string, any>[];
          const headers = results.meta.fields || [];

          resolve({
            headers,
            rows,
            totalRows: rows.length,
            fileType: 'csv',
            preview: rows.slice(0, this.PREVIEW_ROWS)
          });
        },
        error: (error) => {
          logger.error('CSV parsing error:', error);
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse Excel file (XLSX/XLS)
   */
  private static parseExcel(fileBuffer: Buffer): ParsedFileData {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      
      // Extract headers
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        headers,
        rows: rows as Record<string, any>[],
        totalRows: rows.length,
        fileType: 'excel',
        preview: rows.slice(0, this.PREVIEW_ROWS) as Record<string, any>[]
      };
    } catch (error: any) {
      logger.error('Excel parsing error:', error);
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Parse JSON file
   */
  private static parseJSON(fileBuffer: Buffer): ParsedFileData {
    try {
      const jsonString = fileBuffer.toString('utf-8');
      const data = JSON.parse(jsonString);

      let rows: Record<string, any>[];

      // Handle both array and object formats
      if (Array.isArray(data)) {
        rows = data;
      } else if (typeof data === 'object' && data !== null) {
        // If it's an object, check if there's a data array property
        if (Array.isArray(data.data)) {
          rows = data.data;
        } else if (Array.isArray(data.items)) {
          rows = data.items;
        } else if (Array.isArray(data.products)) {
          rows = data.products;
        } else {
          // Wrap single object in array
          rows = [data];
        }
      } else {
        throw new Error('Invalid JSON structure');
      }

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        headers,
        rows,
        totalRows: rows.length,
        fileType: 'json',
        preview: rows.slice(0, this.PREVIEW_ROWS)
      };
    } catch (error: any) {
      logger.error('JSON parsing error:', error);
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }

  /**
   * Parse XML file
   */
  private static parseXML(fileBuffer: Buffer): ParsedFileData {
    try {
      const xmlString = fileBuffer.toString('utf-8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });

      const result = parser.parse(xmlString);

      // Try to find the array of items in the XML structure
      let rows: Record<string, any>[] = [];
      
      // Common XML structures
      if (result.root && Array.isArray(result.root.item)) {
        rows = result.root.item;
      } else if (result.items && Array.isArray(result.items.item)) {
        rows = result.items.item;
      } else if (result.products && Array.isArray(result.products.product)) {
        rows = result.products.product;
      } else {
        // Try to find any array in the structure
        const findArray = (obj: any): any[] | null => {
          if (Array.isArray(obj)) return obj;
          if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
              const found = findArray(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };

        const foundArray = findArray(result);
        if (foundArray) {
          rows = foundArray;
        } else {
          // If no array found, wrap the entire result
          rows = [result];
        }
      }

      // Flatten nested objects for headers
      const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
        const flattened: Record<string, any> = {};
        
        for (const key in obj) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(flattened, flattenObject(value, newKey));
          } else {
            flattened[newKey] = value;
          }
        }
        
        return flattened;
      };

      const flattenedRows = rows.map(row => flattenObject(row));
      const headers = flattenedRows.length > 0 ? Object.keys(flattenedRows[0]) : [];

      return {
        headers,
        rows: flattenedRows,
        totalRows: flattenedRows.length,
        fileType: 'xml',
        preview: flattenedRows.slice(0, this.PREVIEW_ROWS)
      };
    } catch (error: any) {
      logger.error('XML parsing error:', error);
      throw new Error(`Failed to parse XML file: ${error.message}`);
    }
  }

  /**
   * Validate file before parsing
   */
  static validateFile(fileName: string, mimeType: string, fileSize: number): void {
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const allowedExtensions = ['csv', 'xlsx', 'xls', 'json', 'xml'];
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new Error(`Unsupported file extension. Allowed: ${allowedExtensions.join(', ')}`);
    }
  }

  /**
   * Detect column types from sample data
   */
  static detectColumnTypes(rows: Record<string, any>[], headers: string[]): Record<string, string> {
    const types: Record<string, string> = {};
    const sampleSize = Math.min(100, rows.length);

    for (const header of headers) {
      const samples = rows.slice(0, sampleSize).map(row => row[header]);
      types[header] = this.inferType(samples);
    }

    return types;
  }

  /**
   * Infer data type from samples
   */
  private static inferType(samples: any[]): string {
    const nonNullSamples = samples.filter(s => s !== null && s !== undefined && s !== '');

    if (nonNullSamples.length === 0) return 'string';

    let allNumbers = true;
    let allDates = true;
    let allBooleans = true;

    for (const sample of nonNullSamples) {
      if (typeof sample === 'number' || !isNaN(Number(sample))) {
        allBooleans = false;
        allDates = false;
      } else if (typeof sample === 'boolean' || sample === 'true' || sample === 'false') {
        allNumbers = false;
        allDates = false;
      } else if (this.isDate(sample)) {
        allNumbers = false;
        allBooleans = false;
      } else {
        allNumbers = false;
        allDates = false;
        allBooleans = false;
      }
    }

    if (allNumbers) return 'number';
    if (allBooleans) return 'boolean';
    if (allDates) return 'date';
    return 'string';
  }

  /**
   * Check if value is a date
   */
  private static isDate(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value !== 'string') return false;

    const date = new Date(value);
    return !isNaN(date.getTime());
  }
}

