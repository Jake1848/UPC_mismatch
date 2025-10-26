import { Transform, Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

const pipelineAsync = promisify(pipeline);

export interface StreamProcessingOptions {
  batchSize?: number;
  maxMemoryUsage?: number; // in MB
  onProgress?: (processed: number, total?: number) => void;
  onBatch?: (batch: any[], batchNumber: number) => Promise<void>;
  onError?: (error: Error) => void;
}

export interface StreamProcessingResult {
  totalProcessed: number;
  totalBatches: number;
  errors: Array<{ row: number; error: string }>;
  metadata: {
    headers: string[];
    fileType: string;
    estimatedRows?: number;
  };
}

export class StreamFileProcessor extends EventEmitter {
  private options: Required<StreamProcessingOptions>;

  constructor(options: StreamProcessingOptions = {}) {
    super();
    this.options = {
      batchSize: options.batchSize || 1000,
      maxMemoryUsage: options.maxMemoryUsage || 100, // 100MB default
      onProgress: options.onProgress || (() => {}),
      onBatch: options.onBatch || (async () => {}),
      onError: options.onError || ((error) => logger.error('Stream processing error:', error))
    };
  }

  async processCsvStream(filePath: string): Promise<StreamProcessingResult> {
    return new Promise((resolve, reject) => {
      let totalProcessed = 0;
      let totalBatches = 0;
      let currentBatch: any[] = [];
      let headers: string[] = [];
      const errors: Array<{ row: number; error: string }> = [];
      let isFirstRow = true;

      const readStream = createReadStream(filePath, { encoding: 'utf8' });

      const csvParser = csv({
        skipEmptyLines: true,
        strict: false,
      });

      const batchProcessor = new Transform({
        objectMode: true,
        async transform(chunk: any, encoding, callback) {
          try {
            // Capture headers from first row
            if (isFirstRow) {
              headers = Object.keys(chunk);
              isFirstRow = false;
              this.emit('headers', headers);
            }

            currentBatch.push(chunk);

            if (currentBatch.length >= this.options.batchSize) {
              await this.processBatch(currentBatch, totalBatches++);
              totalProcessed += currentBatch.length;
              this.options.onProgress(totalProcessed);
              currentBatch = [];
            }

            callback();
          } catch (error) {
            errors.push({
              row: totalProcessed,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            callback();
          }
        }.bind(this),

        async flush(callback) {
          try {
            // Process remaining batch
            if (currentBatch.length > 0) {
              await this.processBatch(currentBatch, totalBatches++);
              totalProcessed += currentBatch.length;
            }

            const result: StreamProcessingResult = {
              totalProcessed,
              totalBatches,
              errors,
              metadata: {
                headers,
                fileType: 'csv'
              }
            };

            resolve(result);
            callback();
          } catch (error) {
            reject(error);
          }
        }.bind(this)
      });

      readStream
        .pipe(csvParser)
        .pipe(batchProcessor)
        .on('error', (error) => {
          this.options.onError(error);
          reject(error);
        });
    });
  }

  async processExcelStream(filePath: string, sheetName?: string): Promise<StreamProcessingResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // For Excel files, we need to read the file first to get structure
        // But we can process rows in batches to manage memory
        const workbook = XLSX.readFile(filePath, {
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        const selectedSheet = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[selectedSheet];

        if (!sheet) {
          throw new Error(`Sheet "${selectedSheet}" not found`);
        }

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const headers: string[] = [];
        const errors: Array<{ row: number; error: string }> = [];

        // Extract headers
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
          const cell = sheet[cellAddress];
          headers.push(cell ? String(cell.v) : `Column_${col + 1}`);
        }

        let totalProcessed = 0;
        let totalBatches = 0;
        let currentBatch: any[] = [];

        // Process rows in batches
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
          try {
            const rowData: any = {};

            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = sheet[cellAddress];
              const header = headers[col - range.s.c];
              rowData[header] = cell ? cell.v : null;
            }

            currentBatch.push(rowData);

            if (currentBatch.length >= this.options.batchSize) {
              await this.processBatch(currentBatch, totalBatches++);
              totalProcessed += currentBatch.length;
              this.options.onProgress(totalProcessed, range.e.r - range.s.r);
              currentBatch = [];

              // Memory usage check
              if (this.getMemoryUsage() > this.options.maxMemoryUsage) {
                await this.forceGarbageCollection();
              }
            }
          } catch (error) {
            errors.push({
              row: row - range.s.r,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Process remaining batch
        if (currentBatch.length > 0) {
          await this.processBatch(currentBatch, totalBatches++);
          totalProcessed += currentBatch.length;
        }

        const result: StreamProcessingResult = {
          totalProcessed,
          totalBatches,
          errors,
          metadata: {
            headers,
            fileType: 'excel',
            estimatedRows: range.e.r - range.s.r
          }
        };

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  async processJsonStream(filePath: string): Promise<StreamProcessingResult> {
    return new Promise((resolve, reject) => {
      let totalProcessed = 0;
      let totalBatches = 0;
      let currentBatch: any[] = [];
      let headers: string[] = [];
      const errors: Array<{ row: number; error: string }> = [];
      let buffer = '';
      let isFirstObject = true;

      const readStream = createReadStream(filePath, { encoding: 'utf8' });

      const jsonProcessor = new Transform({
        transform(chunk: Buffer, encoding, callback) {
          try {
            buffer += chunk.toString();

            // Simple JSON array processing (assumes array of objects)
            if (buffer.includes('[')) {
              buffer = buffer.substring(buffer.indexOf('[') + 1);
            }

            let objectStartIndex = 0;
            let braceCount = 0;
            let inString = false;
            let escaped = false;

            for (let i = 0; i < buffer.length; i++) {
              const char = buffer[i];

              if (escaped) {
                escaped = false;
                continue;
              }

              if (char === '\\') {
                escaped = true;
                continue;
              }

              if (char === '"' && !escaped) {
                inString = !inString;
                continue;
              }

              if (!inString) {
                if (char === '{') {
                  if (braceCount === 0) {
                    objectStartIndex = i;
                  }
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    // Complete object found
                    const objectStr = buffer.substring(objectStartIndex, i + 1);
                    try {
                      const obj = JSON.parse(objectStr);

                      if (isFirstObject) {
                        headers = Object.keys(obj);
                        isFirstObject = false;
                        this.emit('headers', headers);
                      }

                      currentBatch.push(obj);

                      if (currentBatch.length >= this.options.batchSize) {
                        this.processBatch(currentBatch, totalBatches++)
                          .then(() => {
                            totalProcessed += currentBatch.length;
                            this.options.onProgress(totalProcessed);
                            currentBatch = [];
                          })
                          .catch(error => this.options.onError(error));
                      }
                    } catch (parseError) {
                      errors.push({
                        row: totalProcessed,
                        error: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
                      });
                    }

                    // Remove processed part from buffer
                    buffer = buffer.substring(i + 1);
                    i = -1; // Reset loop
                    objectStartIndex = 0;
                  }
                }
              }
            }

            callback();
          } catch (error) {
            callback(error);
          }
        }.bind(this),

        async flush(callback) {
          try {
            // Process remaining batch
            if (currentBatch.length > 0) {
              await this.processBatch(currentBatch, totalBatches++);
              totalProcessed += currentBatch.length;
            }

            const result: StreamProcessingResult = {
              totalProcessed,
              totalBatches,
              errors,
              metadata: {
                headers,
                fileType: 'json'
              }
            };

            resolve(result);
            callback();
          } catch (error) {
            reject(error);
          }
        }.bind(this)
      });

      readStream
        .pipe(jsonProcessor)
        .on('error', (error) => {
          this.options.onError(error);
          reject(error);
        });
    });
  }

  private async processBatch(batch: any[], batchNumber: number): Promise<void> {
    try {
      await this.options.onBatch(batch, batchNumber);
      this.emit('batch', { batch, batchNumber });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024; // Convert to MB
  }

  private async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  // Static convenience methods
  static async processFile(
    filePath: string,
    fileType: 'csv' | 'excel' | 'json',
    options: StreamProcessingOptions = {}
  ): Promise<StreamProcessingResult> {
    const processor = new StreamFileProcessor(options);

    switch (fileType) {
      case 'csv':
        return processor.processCsvStream(filePath);
      case 'excel':
        return processor.processExcelStream(filePath);
      case 'json':
        return processor.processJsonStream(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
}

// Memory-efficient data validation transform
export class DataValidationTransform extends Transform {
  private schema: any;
  private validationErrors: Array<{ row: number; errors: string[] }> = [];

  constructor(schema: any) {
    super({ objectMode: true });
    this.schema = schema;
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: Function): void {
    try {
      // Validate chunk against schema
      const validationResult = this.validateRow(chunk);

      if (validationResult.isValid) {
        this.push(chunk);
      } else {
        this.validationErrors.push({
          row: (chunk as any).__rowNumber || 0,
          errors: validationResult.errors
        });
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  private validateRow(row: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation logic
    if (this.schema.required) {
      for (const field of this.schema.required) {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push(`Required field '${field}' is missing or empty`);
        }
      }
    }

    if (this.schema.types) {
      for (const [field, expectedType] of Object.entries(this.schema.types)) {
        if (row[field] !== undefined && row[field] !== null) {
          if (!this.validateType(row[field], expectedType as string)) {
            errors.push(`Field '${field}' has invalid type. Expected ${expectedType}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return !isNaN(Number(value));
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'upc':
        return /^\d{12}$/.test(value.toString());
      default:
        return true;
    }
  }

  getValidationErrors() {
    return this.validationErrors;
  }
}

export default StreamFileProcessor;