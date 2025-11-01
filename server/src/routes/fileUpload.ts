import express from 'express';
import multer from 'multer';
import { FileParserService } from '../services/fileParser';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/xml',
      'text/xml'
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls|json|xml)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: CSV, Excel, JSON, XML'));
    }
  }
});

/**
 * POST /api/v1/files/upload
 * Upload and parse a file
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    logger.info(`Parsing file: ${req.file.originalname}`);

    // Parse the file
    const parsedData = await FileParserService.parseFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Detect column types
    const columnTypes = FileParserService.detectColumnTypes(
      parsedData.rows,
      parsedData.headers
    );

    res.json({
      success: true,
      data: {
        ...parsedData,
        columnTypes,
        fileName: req.file.originalname,
        fileSize: req.file.size
      }
    });
  } catch (error: any) {
    logger.error('File upload error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/files/validate
 * Validate file before upload
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { fileName, mimeType, fileSize } = req.body;

    if (!fileName || !mimeType || !fileSize) {
      return res.status(400).json({
        error: 'fileName, mimeType, and fileSize are required'
      });
    }

    FileParserService.validateFile(fileName, mimeType, fileSize);

    res.json({
      success: true,
      message: 'File is valid'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

