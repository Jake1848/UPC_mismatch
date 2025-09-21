import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { logger } from '../utils/logger'

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.AWS_ENDPOINT && {
    endpoint: process.env.AWS_ENDPOINT,
    forcePathStyle: true, // Required for MinIO
  }),
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET!

// Allowed file types for analysis
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'text/plain', // .txt
  'application/json', // .json
  'text/tab-separated-values', // .tsv
]

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error as Error, uploadDir)
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`))
  }
}

// Configure multer middleware
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow single file upload
  },
}).single('file')

// Upload file to S3
export async function uploadToS3(
  file: Express.Multer.File,
  organizationId: string,
  analysisId: string
): Promise<string> {
  try {
    const key = `organizations/${organizationId}/analyses/${analysisId}/${file.originalname}`

    // Read file content
    const fileContent = await fs.readFile(file.path)

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        organizationId,
        analysisId,
      },
    })

    await s3Client.send(uploadCommand)

    // Clean up temporary file
    await fs.unlink(file.path)

    logger.info(`File uploaded to S3: ${key}`)

    return key
  } catch (error) {
    logger.error('S3 upload error:', error)

    // Clean up temporary file on error
    try {
      await fs.unlink(file.path)
    } catch (unlinkError) {
      logger.error('Error deleting temporary file:', unlinkError)
    }

    throw new Error('Failed to upload file to storage')
  }
}

// Get download URL for file
export async function getDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    logger.error('Error generating download URL:', error)
    throw new Error('Failed to generate download URL')
  }
}

// Delete file from S3
export async function deleteFromS3(fileKey: string): Promise<void> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    })

    await s3Client.send(deleteCommand)
    logger.info(`File deleted from S3: ${fileKey}`)
  } catch (error) {
    logger.error('S3 delete error:', error)
    throw new Error('Failed to delete file from storage')
  }
}

// Get file from S3 as buffer
export async function getFileFromS3(fileKey: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      throw new Error('No file content received')
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    const stream = response.Body as any

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  } catch (error) {
    logger.error('Error retrieving file from S3:', error)
    throw new Error('Failed to retrieve file from storage')
  }
}

// Validate file before upload
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    }
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), TSV (.tsv)`
    }
  }

  // Check file extension matches mime type
  const ext = path.extname(file.originalname).toLowerCase()
  const mimeToExt: Record<string, string[]> = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
    'text/plain': ['.txt', '.csv'],
    'application/json': ['.json'],
    'text/tab-separated-values': ['.tsv', '.txt'],
  }

  const allowedExts = mimeToExt[file.mimetype] || []
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `File extension '${ext}' does not match file type`
    }
  }

  return { valid: true }
}

// Generate unique file key
export function generateFileKey(
  organizationId: string,
  analysisId: string,
  originalName: string
): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 15)
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)

  return `organizations/${organizationId}/analyses/${analysisId}/${timestamp}-${randomSuffix}-${baseName}${ext}`
}

// File type detection based on content
export async function detectFileType(filePath: string): Promise<{
  type: 'excel' | 'csv' | 'json' | 'tsv' | 'unknown'
  encoding?: string
}> {
  try {
    // Read first few bytes to detect file type
    const buffer = await fs.readFile(filePath, { encoding: null })
    const header = buffer.slice(0, 8)

    // Check for Excel file signatures
    if (header[0] === 0x50 && header[1] === 0x4B) {
      // ZIP signature (Excel .xlsx)
      return { type: 'excel' }
    }

    if (header[0] === 0xD0 && header[1] === 0xCF) {
      // OLE2 signature (Excel .xls)
      return { type: 'excel' }
    }

    // For text-based files, read as text and analyze
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length))

    // Try to parse as JSON
    try {
      JSON.parse(content)
      return { type: 'json', encoding: 'utf8' }
    } catch {
      // Not JSON, continue
    }

    // Check for CSV/TSV by analyzing delimiters
    const lines = content.split('\n').slice(0, 5) // Check first 5 lines
    let commaCount = 0
    let tabCount = 0

    for (const line of lines) {
      commaCount += (line.match(/,/g) || []).length
      tabCount += (line.match(/\t/g) || []).length
    }

    if (tabCount > commaCount) {
      return { type: 'tsv', encoding: 'utf8' }
    } else if (commaCount > 0) {
      return { type: 'csv', encoding: 'utf8' }
    }

    return { type: 'unknown', encoding: 'utf8' }
  } catch (error) {
    logger.error('File type detection error:', error)
    return { type: 'unknown' }
  }
}

// Clean up old temporary files
export async function cleanupTempFiles(olderThanHours: number = 24): Promise<void> {
  try {
    const uploadDir = path.join(__dirname, '../../uploads')
    const files = await fs.readdir(uploadDir)
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)

    for (const file of files) {
      const filePath = path.join(uploadDir, file)
      const stats = await fs.stat(filePath)

      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(filePath)
        logger.info(`Cleaned up temporary file: ${file}`)
      }
    }
  } catch (error) {
    logger.error('Error cleaning up temporary files:', error)
  }
}

// Schedule cleanup job (call this on server startup)
export function scheduleCleanup(): void {
  // Clean up every 6 hours
  setInterval(() => {
    cleanupTempFiles(24).catch(error => {
      logger.error('Scheduled cleanup failed:', error)
    })
  }, 6 * 60 * 60 * 1000)

  logger.info('Temporary file cleanup scheduled')
}