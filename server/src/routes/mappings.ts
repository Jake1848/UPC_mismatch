import express from 'express';
import { ColumnMappingService } from '../services/columnMapping';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/v1/mappings
 * Create a new mapping template
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, fileType, mappings, description } = req.body;
    const { organizationId } = req;
    const userId = req.user?.id;

    if (!name || !fileType || !mappings) {
      return res.status(400).json({
        error: 'name, fileType, and mappings are required'
      });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const template = await ColumnMappingService.createTemplate(
      userId,
      organizationId!,
      name,
      fileType,
      mappings,
      description
    );

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error: any) {
    logger.error('Create mapping template error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/mappings
 * Get all mapping templates
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const { fileType } = req.query;

    const templates = await ColumnMappingService.getTemplates(
      organizationId!,
      fileType as string
    );

    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    logger.error('Get mapping templates error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/mappings/:id
 * Get a specific mapping template
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;

    const template = await ColumnMappingService.getTemplate(id, organizationId!);

    if (!template) {
      return res.status(404).json({ error: 'Mapping template not found' });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    logger.error('Get mapping template error:', error);
    next(error);
  }
});

/**
 * PUT /api/v1/mappings/:id
 * Update a mapping template
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;
    const updates = req.body;

    const template = await ColumnMappingService.updateTemplate(
      id,
      organizationId!,
      updates
    );

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    logger.error('Update mapping template error:', error);
    next(error);
  }
});

/**
 * DELETE /api/v1/mappings/:id
 * Delete a mapping template
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;

    await ColumnMappingService.deleteTemplate(id, organizationId!);

    res.json({
      success: true,
      message: 'Mapping template deleted'
    });
  } catch (error: any) {
    logger.error('Delete mapping template error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/mappings/suggest
 * Get suggested mappings for columns
 */
router.post('/suggest', async (req, res, next) => {
  try {
    const { sourceHeaders, targetFields } = req.body;

    if (!sourceHeaders || !targetFields) {
      return res.status(400).json({
        error: 'sourceHeaders and targetFields are required'
      });
    }

    const suggestions = ColumnMappingService.suggestMappings(
      sourceHeaders,
      targetFields
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error: any) {
    logger.error('Suggest mappings error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/mappings/validate
 * Validate a mapping configuration
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { mappings, requiredFields } = req.body;

    if (!mappings || !requiredFields) {
      return res.status(400).json({
        error: 'mappings and requiredFields are required'
      });
    }

    const errors = ColumnMappingService.validateMapping(mappings, requiredFields);

    res.json({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors
      }
    });
  } catch (error: any) {
    logger.error('Validate mapping error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/mappings/apply
 * Apply mapping to data rows
 */
router.post('/apply', async (req, res, next) => {
  try {
    const { rows, mappings } = req.body;

    if (!rows || !mappings) {
      return res.status(400).json({
        error: 'rows and mappings are required'
      });
    }

    const mappedRows = ColumnMappingService.applyMapping(rows, mappings);

    res.json({
      success: true,
      data: mappedRows
    });
  } catch (error: any) {
    logger.error('Apply mapping error:', error);
    next(error);
  }
});

export default router;

