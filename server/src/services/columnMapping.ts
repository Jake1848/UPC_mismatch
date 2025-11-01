import { prisma } from '../app';
import { logger } from '../utils/logger';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transformation?: string;
  defaultValue?: any;
}

export interface MappingTemplate {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  description?: string;
  fileType: string;
  mappings: ColumnMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export class ColumnMappingService {
  /**
   * Create a new mapping template
   */
  static async createTemplate(
    userId: string,
    organizationId: string,
    name: string,
    fileType: string,
    mappings: ColumnMapping[],
    description?: string
  ): Promise<MappingTemplate> {
    try {
      const template = await prisma.mappingTemplate.create({
        data: {
          userId,
          organizationId,
          name,
          description,
          fileType,
          mappings: JSON.stringify(mappings)
        }
      });

      logger.info(`Created mapping template: ${template.id}`);

      return {
        ...template,
        mappings: JSON.parse(template.mappings as string)
      };
    } catch (error: any) {
      logger.error('Error creating mapping template:', error);
      throw new Error(`Failed to create mapping template: ${error.message}`);
    }
  }

  /**
   * Get mapping template by ID
   */
  static async getTemplate(templateId: string, organizationId: string): Promise<MappingTemplate | null> {
    try {
      const template = await prisma.mappingTemplate.findFirst({
        where: {
          id: templateId,
          organizationId
        }
      });

      if (!template) return null;

      return {
        ...template,
        mappings: JSON.parse(template.mappings as string)
      };
    } catch (error: any) {
      logger.error('Error getting mapping template:', error);
      throw new Error(`Failed to get mapping template: ${error.message}`);
    }
  }

  /**
   * Get all mapping templates for an organization
   */
  static async getTemplates(organizationId: string, fileType?: string): Promise<MappingTemplate[]> {
    try {
      const where: any = { organizationId };
      if (fileType) {
        where.fileType = fileType;
      }

      const templates = await prisma.mappingTemplate.findMany({
        where,
        orderBy: { updatedAt: 'desc' }
      });

      return templates.map(template => ({
        ...template,
        mappings: JSON.parse(template.mappings as string)
      }));
    } catch (error: any) {
      logger.error('Error getting mapping templates:', error);
      throw new Error(`Failed to get mapping templates: ${error.message}`);
    }
  }

  /**
   * Update mapping template
   */
  static async updateTemplate(
    templateId: string,
    organizationId: string,
    updates: Partial<{
      name: string;
      description: string;
      mappings: ColumnMapping[];
    }>
  ): Promise<MappingTemplate> {
    try {
      const data: any = {};
      if (updates.name) data.name = updates.name;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.mappings) data.mappings = JSON.stringify(updates.mappings);

      const template = await prisma.mappingTemplate.update({
        where: {
          id: templateId,
          organizationId
        },
        data
      });

      logger.info(`Updated mapping template: ${template.id}`);

      return {
        ...template,
        mappings: JSON.parse(template.mappings as string)
      };
    } catch (error: any) {
      logger.error('Error updating mapping template:', error);
      throw new Error(`Failed to update mapping template: ${error.message}`);
    }
  }

  /**
   * Delete mapping template
   */
  static async deleteTemplate(templateId: string, organizationId: string): Promise<void> {
    try {
      await prisma.mappingTemplate.delete({
        where: {
          id: templateId,
          organizationId
        }
      });

      logger.info(`Deleted mapping template: ${templateId}`);
    } catch (error: any) {
      logger.error('Error deleting mapping template:', error);
      throw new Error(`Failed to delete mapping template: ${error.message}`);
    }
  }

  /**
   * Apply mapping to data rows
   */
  static applyMapping(
    rows: Record<string, any>[],
    mappings: ColumnMapping[]
  ): Record<string, any>[] {
    return rows.map(row => {
      const mappedRow: Record<string, any> = {};

      for (const mapping of mappings) {
        let value = row[mapping.sourceColumn];

        // Apply transformation if specified
        if (mapping.transformation) {
          value = this.applyTransformation(value, mapping.transformation);
        }

        // Use default value if source is null/undefined
        if ((value === null || value === undefined) && mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        }

        mappedRow[mapping.targetField] = value;
      }

      return mappedRow;
    });
  }

  /**
   * Apply transformation to a value
   */
  private static applyTransformation(value: any, transformation: string): any {
    if (value === null || value === undefined) return value;

    switch (transformation) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'remove_spaces':
        return String(value).replace(/\s/g, '');
      case 'remove_special_chars':
        return String(value).replace(/[^a-zA-Z0-9]/g, '');
      default:
        return value;
    }
  }

  /**
   * Suggest mappings based on column names
   */
  static suggestMappings(
    sourceHeaders: string[],
    targetFields: string[]
  ): ColumnMapping[] {
    const suggestions: ColumnMapping[] = [];

    // Common field name variations
    const fieldVariations: Record<string, string[]> = {
      'upc': ['upc', 'barcode', 'ean', 'gtin', 'product_code', 'item_code'],
      'sku': ['sku', 'item_number', 'product_id', 'item_id'],
      'product_name': ['product_name', 'name', 'title', 'product_title', 'item_name'],
      'description': ['description', 'desc', 'product_description', 'details'],
      'price': ['price', 'cost', 'unit_price', 'retail_price', 'selling_price'],
      'quantity': ['quantity', 'qty', 'stock', 'inventory', 'available'],
      'category': ['category', 'product_category', 'type', 'product_type'],
      'brand': ['brand', 'manufacturer', 'vendor', 'supplier'],
      'image_url': ['image_url', 'image', 'photo', 'picture', 'image_link'],
      'weight': ['weight', 'product_weight', 'shipping_weight'],
      'dimensions': ['dimensions', 'size', 'measurements']
    };

    for (const sourceHeader of sourceHeaders) {
      const normalizedSource = sourceHeader.toLowerCase().replace(/[_\s-]/g, '');

      for (const [targetField, variations] of Object.entries(fieldVariations)) {
        const normalizedVariations = variations.map(v => v.toLowerCase().replace(/[_\s-]/g, ''));

        if (normalizedVariations.includes(normalizedSource)) {
          suggestions.push({
            sourceColumn: sourceHeader,
            targetField: targetField
          });
          break;
        }
      }
    }

    return suggestions;
  }

  /**
   * Validate mapping configuration
   */
  static validateMapping(mappings: ColumnMapping[], requiredFields: string[]): string[] {
    const errors: string[] = [];
    const mappedFields = new Set(mappings.map(m => m.targetField));

    // Check for required fields
    for (const required of requiredFields) {
      if (!mappedFields.has(required)) {
        errors.push(`Required field '${required}' is not mapped`);
      }
    }

    // Check for duplicate target fields
    const targetFields = mappings.map(m => m.targetField);
    const duplicates = targetFields.filter((field, index) => targetFields.indexOf(field) !== index);
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate target fields: ${[...new Set(duplicates)].join(', ')}`);
    }

    return errors;
  }
}

