import express from 'express'
import { body, param, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorHandler'
import { requireAnalyst, AuthenticatedRequest } from '../middleware/auth'
import { aiAnalysisService } from '../services/aiAnalysis'
import { logger, logAudit } from '../utils/logger'

const router = express.Router()

// Analyze UPC conflict with AI
router.post('/analyze-conflict', [
  body('upc').isString().isLength({ min: 8, max: 14 }).withMessage('Valid UPC required'),
  body('productName').optional().isString().withMessage('Product name must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('category').optional().isString().withMessage('Category must be a string'),
  body('existingData').optional().isArray().withMessage('Existing data must be an array'),
  body('conflictContext').optional().isString().withMessage('Conflict context must be a string')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { upc, productName, description, category, existingData, conflictContext } = req.body

  try {
    const analysis = await aiAnalysisService.analyzeUPCConflict({
      upc,
      productName,
      description,
      category,
      existingData,
      conflictContext
    })

    // Log AI usage for audit
    logAudit('ai_analysis_used', req.user!.id, {
      upc,
      analysisType: 'conflict_resolution',
      confidence: analysis.confidence,
      riskLevel: analysis.riskLevel
    })

    res.json({
      success: true,
      analysis,
      aiEnabled: aiAnalysisService.isEnabled()
    })
  } catch (error) {
    logger.error('AI conflict analysis failed:', error)
    res.status(500).json({
      error: 'AI analysis failed',
      message: 'Unable to analyze conflict with AI'
    })
  }
}))

// Detect fraud patterns
router.post('/detect-fraud', [
  body('upcData').isArray().withMessage('UPC data array required'),
  body('upcData').isLength({ min: 1 }).withMessage('At least one UPC record required')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { upcData } = req.body

  try {
    const fraudAnalysis = await aiAnalysisService.detectFraud(upcData)

    // Log fraud detection usage
    logAudit('fraud_detection_used', req.user!.id, {
      recordCount: upcData.length,
      fraudScore: fraudAnalysis.fraudScore,
      isSuspicious: fraudAnalysis.isSuspicious
    })

    res.json({
      success: true,
      fraudAnalysis,
      aiEnabled: aiAnalysisService.isEnabled()
    })
  } catch (error) {
    logger.error('Fraud detection failed:', error)
    res.status(500).json({
      error: 'Fraud detection failed',
      message: 'Unable to analyze data for fraud patterns'
    })
  }
}))

// Categorize product with AI
router.post('/categorize-product', [
  body('upc').isString().isLength({ min: 8, max: 14 }).withMessage('Valid UPC required'),
  body('name').isString().isLength({ min: 1 }).withMessage('Product name required'),
  body('description').optional().isString().withMessage('Description must be a string')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { upc, name, description } = req.body

  try {
    const categorization = await aiAnalysisService.categorizeProduct({
      upc,
      name,
      description
    })

    // Log categorization usage
    logAudit('ai_categorization_used', req.user!.id, {
      upc,
      category: categorization.category,
      confidence: categorization.confidence
    })

    res.json({
      success: true,
      categorization,
      aiEnabled: aiAnalysisService.isEnabled()
    })
  } catch (error) {
    logger.error('Product categorization failed:', error)
    res.status(500).json({
      error: 'Categorization failed',
      message: 'Unable to categorize product with AI'
    })
  }
}))

// Get AI service status
router.get('/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json({
    aiEnabled: aiAnalysisService.isEnabled(),
    features: {
      conflictAnalysis: aiAnalysisService.isEnabled(),
      fraudDetection: aiAnalysisService.isEnabled(),
      productCategorization: aiAnalysisService.isEnabled()
    },
    message: aiAnalysisService.isEnabled()
      ? 'AI analysis is fully operational'
      : 'AI analysis requires OpenAI API key configuration'
  })
}))

export default router