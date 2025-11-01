import { prisma } from '../app';
import { logger } from '../utils/logger';

export interface Product {
  id?: string;
  organizationId: string;
  sku: string;
  upc?: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  price?: number;
  cost?: number;
  quantity?: number;
  weight?: number;
  dimensions?: string;
  images?: string[];
  customAttributes?: Record<string, any>;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCategory {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  parentId?: string;
  slug: string;
  order?: number;
}

export interface CustomAttribute {
  id?: string;
  organizationId: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'textarea';
  options?: string[];
  required: boolean;
  defaultValue?: any;
}

export class PIMService {
  /**
   * Create a new product
   */
  static async createProduct(product: Product): Promise<Product> {
    try {
      const created = await prisma.product.create({
        data: {
          organizationId: product.organizationId,
          sku: product.sku,
          upc: product.upc,
          name: product.name,
          description: product.description,
          category: product.category,
          brand: product.brand,
          price: product.price,
          cost: product.cost,
          quantity: product.quantity,
          weight: product.weight,
          dimensions: product.dimensions,
          images: product.images ? JSON.stringify(product.images) : null,
          customAttributes: product.customAttributes ? JSON.stringify(product.customAttributes) : null,
          status: product.status
        }
      });

      logger.info(`Created product: ${created.id}`);

      return this.formatProduct(created);
    } catch (error: any) {
      logger.error('Error creating product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Bulk create products
   */
  static async bulkCreateProducts(products: Product[]): Promise<{ created: number; errors: any[] }> {
    const errors: any[] = [];
    let created = 0;

    for (const product of products) {
      try {
        await this.createProduct(product);
        created++;
      } catch (error: any) {
        errors.push({
          product: product.sku,
          error: error.message
        });
      }
    }

    logger.info(`Bulk created ${created} products with ${errors.length} errors`);

    return { created, errors };
  }

  /**
   * Get product by ID
   */
  static async getProduct(productId: string, organizationId: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          organizationId
        }
      });

      return product ? this.formatProduct(product) : null;
    } catch (error: any) {
      logger.error('Error getting product:', error);
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Get product by SKU
   */
  static async getProductBySKU(sku: string, organizationId: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findFirst({
        where: {
          sku,
          organizationId
        }
      });

      return product ? this.formatProduct(product) : null;
    } catch (error: any) {
      logger.error('Error getting product by SKU:', error);
      throw new Error(`Failed to get product by SKU: ${error.message}`);
    }
  }

  /**
   * Get all products for an organization
   */
  static async getProducts(
    organizationId: string,
    filters?: {
      status?: string;
      category?: string;
      brand?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { organizationId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.brand) {
        where.brand = filters.brand;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { upc: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.product.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        products: products.map(p => this.formatProduct(p)),
        total,
        page,
        totalPages
      };
    } catch (error: any) {
      logger.error('Error getting products:', error);
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * Update product
   */
  static async updateProduct(
    productId: string,
    organizationId: string,
    updates: Partial<Product>
  ): Promise<Product> {
    try {
      const data: any = {};
      
      if (updates.sku) data.sku = updates.sku;
      if (updates.upc !== undefined) data.upc = updates.upc;
      if (updates.name) data.name = updates.name;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.category !== undefined) data.category = updates.category;
      if (updates.brand !== undefined) data.brand = updates.brand;
      if (updates.price !== undefined) data.price = updates.price;
      if (updates.cost !== undefined) data.cost = updates.cost;
      if (updates.quantity !== undefined) data.quantity = updates.quantity;
      if (updates.weight !== undefined) data.weight = updates.weight;
      if (updates.dimensions !== undefined) data.dimensions = updates.dimensions;
      if (updates.images) data.images = JSON.stringify(updates.images);
      if (updates.customAttributes) data.customAttributes = JSON.stringify(updates.customAttributes);
      if (updates.status) data.status = updates.status;

      const product = await prisma.product.update({
        where: {
          id: productId,
          organizationId
        },
        data
      });

      logger.info(`Updated product: ${product.id}`);

      return this.formatProduct(product);
    } catch (error: any) {
      logger.error('Error updating product:', error);
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(productId: string, organizationId: string): Promise<void> {
    try {
      await prisma.product.delete({
        where: {
          id: productId,
          organizationId
        }
      });

      logger.info(`Deleted product: ${productId}`);
    } catch (error: any) {
      logger.error('Error deleting product:', error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Create custom attribute definition
   */
  static async createCustomAttribute(attribute: CustomAttribute): Promise<CustomAttribute> {
    try {
      const created = await prisma.customAttribute.create({
        data: {
          organizationId: attribute.organizationId,
          name: attribute.name,
          label: attribute.label,
          type: attribute.type,
          options: attribute.options ? JSON.stringify(attribute.options) : null,
          required: attribute.required,
          defaultValue: attribute.defaultValue ? JSON.stringify(attribute.defaultValue) : null
        }
      });

      logger.info(`Created custom attribute: ${created.id}`);

      return {
        ...created,
        options: created.options ? JSON.parse(created.options as string) : undefined,
        defaultValue: created.defaultValue ? JSON.parse(created.defaultValue as string) : undefined
      };
    } catch (error: any) {
      logger.error('Error creating custom attribute:', error);
      throw new Error(`Failed to create custom attribute: ${error.message}`);
    }
  }

  /**
   * Get custom attributes for an organization
   */
  static async getCustomAttributes(organizationId: string): Promise<CustomAttribute[]> {
    try {
      const attributes = await prisma.customAttribute.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' }
      });

      return attributes.map(attr => ({
        ...attr,
        options: attr.options ? JSON.parse(attr.options as string) : undefined,
        defaultValue: attr.defaultValue ? JSON.parse(attr.defaultValue as string) : undefined
      }));
    } catch (error: any) {
      logger.error('Error getting custom attributes:', error);
      throw new Error(`Failed to get custom attributes: ${error.message}`);
    }
  }

  /**
   * Create product category
   */
  static async createCategory(category: ProductCategory): Promise<ProductCategory> {
    try {
      const created = await prisma.productCategory.create({
        data: {
          organizationId: category.organizationId,
          name: category.name,
          description: category.description,
          parentId: category.parentId,
          slug: category.slug,
          order: category.order || 0
        }
      });

      logger.info(`Created product category: ${created.id}`);

      return created;
    } catch (error: any) {
      logger.error('Error creating category:', error);
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  /**
   * Get categories for an organization
   */
  static async getCategories(organizationId: string): Promise<ProductCategory[]> {
    try {
      const categories = await prisma.productCategory.findMany({
        where: { organizationId },
        orderBy: { order: 'asc' }
      });

      return categories;
    } catch (error: any) {
      logger.error('Error getting categories:', error);
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  /**
   * Format product for response
   */
  private static formatProduct(product: any): Product {
    return {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      customAttributes: product.customAttributes ? JSON.parse(product.customAttributes) : {}
    };
  }

  /**
   * Get product statistics
   */
  static async getStatistics(organizationId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    categories: number;
    brands: number;
    avgPrice: number;
    totalValue: number;
  }> {
    try {
      const [
        totalProducts,
        activeProducts,
        categories,
        brands,
        priceStats
      ] = await Promise.all([
        prisma.product.count({ where: { organizationId } }),
        prisma.product.count({ where: { organizationId, status: 'active' } }),
        prisma.product.groupBy({
          by: ['category'],
          where: { organizationId, category: { not: null } }
        }),
        prisma.product.groupBy({
          by: ['brand'],
          where: { organizationId, brand: { not: null } }
        }),
        prisma.product.aggregate({
          where: { organizationId, price: { not: null } },
          _avg: { price: true },
          _sum: { price: true }
        })
      ]);

      return {
        totalProducts,
        activeProducts,
        categories: categories.length,
        brands: brands.length,
        avgPrice: priceStats._avg.price || 0,
        totalValue: priceStats._sum.price || 0
      };
    } catch (error: any) {
      logger.error('Error getting product statistics:', error);
      throw new Error(`Failed to get product statistics: ${error.message}`);
    }
  }
}

