import express from 'express';
import { PIMService } from '../services/pim';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/v1/pim/products
 * Create a new product
 */
router.post('/products', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const product = { ...req.body, organizationId };

    if (!product.sku || !product.name) {
      return res.status(400).json({
        error: 'sku and name are required'
      });
    }

    const created = await PIMService.createProduct(product);

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error: any) {
    logger.error('Create product error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/pim/products/bulk
 * Bulk create products
 */
router.post('/products/bulk', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        error: 'products array is required'
      });
    }

    const productsWithOrg = products.map(p => ({ ...p, organizationId }));
    const result = await PIMService.bulkCreateProducts(productsWithOrg);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Bulk create products error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/pim/products
 * Get all products with filters
 */
router.get('/products', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const { status, category, brand, search, page, limit } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (category) filters.category = category as string;
    if (brand) filters.brand = brand as string;
    if (search) filters.search = search as string;
    if (page) filters.page = parseInt(page as string);
    if (limit) filters.limit = parseInt(limit as string);

    const result = await PIMService.getProducts(organizationId!, filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Get products error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/pim/products/:id
 * Get a specific product
 */
router.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;

    const product = await PIMService.getProduct(id, organizationId!);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    logger.error('Get product error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/pim/products/sku/:sku
 * Get product by SKU
 */
router.get('/products/sku/:sku', async (req, res, next) => {
  try {
    const { sku } = req.params;
    const { organizationId } = req;

    const product = await PIMService.getProductBySKU(sku, organizationId!);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    logger.error('Get product by SKU error:', error);
    next(error);
  }
});

/**
 * PUT /api/v1/pim/products/:id
 * Update a product
 */
router.put('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;
    const updates = req.body;

    const product = await PIMService.updateProduct(id, organizationId!, updates);

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    logger.error('Update product error:', error);
    next(error);
  }
});

/**
 * DELETE /api/v1/pim/products/:id
 * Delete a product
 */
router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;

    await PIMService.deleteProduct(id, organizationId!);

    res.json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error: any) {
    logger.error('Delete product error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/pim/attributes
 * Create a custom attribute
 */
router.post('/attributes', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const attribute = { ...req.body, organizationId };

    if (!attribute.name || !attribute.label || !attribute.type) {
      return res.status(400).json({
        error: 'name, label, and type are required'
      });
    }

    const created = await PIMService.createCustomAttribute(attribute);

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error: any) {
    logger.error('Create custom attribute error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/pim/attributes
 * Get all custom attributes
 */
router.get('/attributes', async (req, res, next) => {
  try {
    const { organizationId } = req;

    const attributes = await PIMService.getCustomAttributes(organizationId!);

    res.json({
      success: true,
      data: attributes
    });
  } catch (error: any) {
    logger.error('Get custom attributes error:', error);
    next(error);
  }
});

/**
 * POST /api/v1/pim/categories
 * Create a product category
 */
router.post('/categories', async (req, res, next) => {
  try {
    const { organizationId } = req;
    const category = { ...req.body, organizationId };

    if (!category.name || !category.slug) {
      return res.status(400).json({
        error: 'name and slug are required'
      });
    }

    const created = await PIMService.createCategory(category);

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error: any) {
    logger.error('Create category error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/pim/categories
 * Get all categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const { organizationId } = req;

    const categories = await PIMService.getCategories(organizationId!);

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    logger.error('Get categories error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/pim/statistics
 * Get product statistics
 */
router.get('/statistics', async (req, res, next) => {
  try {
    const { organizationId } = req;

    const stats = await PIMService.getStatistics(organizationId!);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Get statistics error:', error);
    next(error);
  }
});

export default router;

