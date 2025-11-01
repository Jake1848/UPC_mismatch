import express from 'express';
import { ValidationEngineService } from '../services/validationEngine';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/v1/validation/rules
 * Create a new validation rule
 */
router.post('/rules', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const rule = req.body;

    if (!rule.name || !rule.field || !rule.ruleType || !rule.errorMessage) {
      return res.status(400).json({
        error: 'name, field, ruleType, and errorMessage are required'
      });
    }

    const created = await ValidationEngineService.createRule(organizationId!, rule);

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error: any) {
    logger.error('Create validation rule error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/validation/rules
 * Get all validation rules
 */
router.get('/rules', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const { enabled } = req.query;

    const rules = await ValidationEngineService.getRules(
      organizationId!,
      enabled === 'true' ? true : enabled === 'false' ? false : undefined
    );

    res.json({
      success: true,
      data: rules
    });
  } catch (error: any) {
    logger.error('Get validation rules error:', error);
    next(error);
  }
});

/**
 * PUT /api/v1/validation/rules/:id
 * Update a validation rule
 */
router.put('/rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;
    const updates = req.body;

    const rule = await ValidationEngineService.updateRule(id, organizationId!, updates);

    res.json({
      success: true,
      data: rule
    });
  } catch (error: any) {
    logger.error('Update validation rule error:', error);
    next(error);
  }
});

/**
 * DELETE /api/v1/validation/rules/:id
 * Delete a validation rule
 */
router.delete('/rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;

    await ValidationEngineService.deleteRule(id, organizationId!);

    res.json({
      success: true,
      message: 'Validation rule deleted'
    });
  } catch (error: any) {
    logger.error('Delete validation rule error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/validation/validate
 * Validate data rows against rules
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { rows, rules } = req.body;

    if (!rows || !rules) {
      return res.status(400).json({
        error: 'rows and rules are required'
      });
    }

    const result = await ValidationEngineService.validateData(rows, rules);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Validate data error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/validation/default-rules
 * Get default validation rules
 */
router.get('/default-rules', async (req, res, next) => {
  try {
    const defaultRules = ValidationEngineService.getDefaultRules();

    res.json({
      success: true,
      data: defaultRules
    });
  } catch (error: any) {
    logger.error('Get default rules error:', error);
    next(error);
  }
});

export default router;

