import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Common validation rules
export const validators = {
  // Auth validation
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('organizationName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization name must be between 2 and 100 characters'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    handleValidationErrors
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  // File upload validation
  fileUpload: [
    body('settings')
      .optional()
      .isJSON()
      .withMessage('Settings must be valid JSON')
      .customSanitizer((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
      .escape(),
    handleValidationErrors
  ],

  // Analysis validation
  createAnalysis: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Analysis name must be between 1 and 200 characters')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters')
      .escape(),
    body('columns')
      .optional()
      .isArray()
      .withMessage('Columns must be an array'),
    body('columns.*')
      .optional()
      .isString()
      .trim()
      .escape(),
    handleValidationErrors
  ],

  // Conflict resolution validation
  resolveConflict: [
    param('id')
      .isUUID()
      .withMessage('Invalid conflict ID'),
    body('resolution')
      .isIn(['KEEP_EXISTING', 'USE_NEW', 'MANUAL', 'IGNORE'])
      .withMessage('Invalid resolution type'),
    body('manualValue')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .escape(),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters')
      .escape(),
    handleValidationErrors
  ],

  // Organization validation
  updateOrganization: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization name must be between 2 and 100 characters')
      .escape(),
    body('billingEmail')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid billing email'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    handleValidationErrors
  ],

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'name', 'status'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    handleValidationErrors
  ],

  // ID validation
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ],

  // Billing validation
  createCheckoutSession: [
    body('planId')
      .isIn(['free', 'basic', 'professional', 'enterprise'])
      .withMessage('Invalid plan ID'),
    body('billingPeriod')
      .optional()
      .isIn(['monthly', 'yearly'])
      .withMessage('Billing period must be monthly or yearly'),
    handleValidationErrors
  ],

  // Integration validation
  createIntegration: [
    body('type')
      .isIn(['SHOPIFY', 'WOOCOMMERCE', 'AMAZON', 'CUSTOM_API'])
      .withMessage('Invalid integration type'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Integration name must be between 1 and 100 characters')
      .escape(),
    body('config')
      .isObject()
      .withMessage('Config must be an object'),
    body('config.apiKey')
      .optional()
      .isString()
      .trim(),
    body('config.apiSecret')
      .optional()
      .isString()
      .trim(),
    body('config.webhookUrl')
      .optional()
      .isURL()
      .withMessage('Webhook URL must be a valid URL'),
    handleValidationErrors
  ],

  // Report generation validation
  generateReport: [
    body('type')
      .isIn(['CONFLICT_SUMMARY', 'RESOLUTION_HISTORY', 'DATA_QUALITY', 'PERFORMANCE'])
      .withMessage('Invalid report type'),
    body('format')
      .optional()
      .isIn(['PDF', 'CSV', 'EXCEL', 'JSON'])
      .withMessage('Invalid report format'),
    body('dateRange')
      .optional()
      .isObject()
      .withMessage('Date range must be an object'),
    body('dateRange.start')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('dateRange.end')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    handleValidationErrors
  ]
};

// Custom sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove any potential XSS attempts
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query) as any;
  }
  if (req.params) {
    req.params = sanitizeObject(req.params) as any;
  }

  next();
};