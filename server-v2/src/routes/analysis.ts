import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { authenticate } from '../middleware/auth'
import {
  uploadFile,
  getAllAnalyses,
  getAnalysisById,
  deleteAnalysis
} from '../controllers/analysisController'

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'))
    }
  }
})

// All routes require authentication
router.use(authenticate)

// Get all analyses for organization
router.get('/', getAllAnalyses)

// Get single analysis
router.get('/:id', getAnalysisById)

// Upload file for analysis
router.post('/upload', upload.single('file'), uploadFile)

// Delete analysis
router.delete('/:id', deleteAnalysis)

export default router
