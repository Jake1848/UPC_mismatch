import { Engine, Rule } from 'json-rules-engine';
import { prisma } from '../app';
import { logger } from '../utils/logger';

export interface ValidationRule {
  id?: string;
  name: string;
  description?: string;
  field: string;
  ruleType: 'regex' | 'range' | 'required' | 'unique' | 'length' | 'custom' | 'format';
  config: Record<string, any>;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validRecords: number;
  invalidRecords: number;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  row: number;
  field: string;
  value: any;
  message: string;
}

export class ValidationEngineService {
  /**
   * Create a new validation rule
   */
  static async createRule(
    organizationId: string,
    rule: ValidationRule
  ): Promise<ValidationRule> {
    try {
      const created = await prisma.validationRule.create({
        data: {
          organizationId,
          name: rule.name,
          description: rule.description,
          field: rule.field,
          ruleType: rule.ruleType,
          config: JSON.stringify(rule.config),
          errorMessage: rule.errorMessage,
          severity: rule.severity,
          enabled: rule.enabled
        }
      });

      logger.info(`Created validation rule: ${created.id}`);

      return {
        ...created,
        config: JSON.parse(created.config as string)
      };
    } catch (error: any) {
      logger.error('Error creating validation rule:', error);
      throw new Error(`Failed to create validation rule: ${error.message}`);
    }
  }

  /**
   * Get all validation rules for an organization
   */
  static async getRules(organizationId: string, enabled?: boolean): Promise<ValidationRule[]> {
    try {
      const where: any = { organizationId };
      if (enabled !== undefined) {
        where.enabled = enabled;
      }

      const rules = await prisma.validationRule.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return rules.map(rule => ({
        ...rule,
        config: JSON.parse(rule.config as string)
      }));
    } catch (error: any) {
      logger.error('Error getting validation rules:', error);
      throw new Error(`Failed to get validation rules: ${error.message}`);
    }
  }

  /**
   * Update validation rule
   */
  static async updateRule(
    ruleId: string,
    organizationId: string,
    updates: Partial<ValidationRule>
  ): Promise<ValidationRule> {
    try {
      const data: any = {};
      if (updates.name) data.name = updates.name;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.field) data.field = updates.field;
      if (updates.ruleType) data.ruleType = updates.ruleType;
      if (updates.config) data.config = JSON.stringify(updates.config);
      if (updates.errorMessage) data.errorMessage = updates.errorMessage;
      if (updates.severity) data.severity = updates.severity;
      if (updates.enabled !== undefined) data.enabled = updates.enabled;

      const rule = await prisma.validationRule.update({
        where: {
          id: ruleId,
          organizationId
        },
        data
      });

      logger.info(`Updated validation rule: ${rule.id}`);

      return {
        ...rule,
        config: JSON.parse(rule.config as string)
      };
    } catch (error: any) {
      logger.error('Error updating validation rule:', error);
      throw new Error(`Failed to update validation rule: ${error.message}`);
    }
  }

  /**
   * Delete validation rule
   */
  static async deleteRule(ruleId: string, organizationId: string): Promise<void> {
    try {
      await prisma.validationRule.delete({
        where: {
          id: ruleId,
          organizationId
        }
      });

      logger.info(`Deleted validation rule: ${ruleId}`);
    } catch (error: any) {
      logger.error('Error deleting validation rule:', error);
      throw new Error(`Failed to delete validation rule: ${error.message}`);
    }
  }

  /**
   * Validate data rows against rules
   */
  static async validateData(
    rows: Record<string, any>[],
    rules: ValidationRule[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const enabledRules = rules.filter(r => r.enabled);

    // Track unique values for uniqueness validation
    const uniqueValues: Record<string, Set<any>> = {};

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      for (const rule of enabledRules) {
        const value = row[rule.field];
        const validationError = this.validateValue(value, rule, rowIndex, uniqueValues);

        if (validationError) {
          if (rule.severity === 'error') {
            errors.push(validationError);
          } else {
            warnings.push({
              row: validationError.row,
              field: validationError.field,
              value: validationError.value,
              message: validationError.message
            });
          }
        }
      }
    }

    const invalidRecords = new Set(errors.map(e => e.row)).size;
    const validRecords = rows.length - invalidRecords;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validRecords,
      invalidRecords
    };
  }

  /**
   * Validate a single value against a rule
   */
  private static validateValue(
    value: any,
    rule: ValidationRule,
    rowIndex: number,
    uniqueValues: Record<string, Set<any>>
  ): ValidationError | null {
    try {
      switch (rule.ruleType) {
        case 'required':
          if (value === null || value === undefined || value === '') {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          break;

        case 'regex':
          if (value && !new RegExp(rule.config.pattern).test(String(value))) {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          break;

        case 'range':
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            if (rule.config.min !== undefined && numValue < rule.config.min) {
              return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
            }
            if (rule.config.max !== undefined && numValue > rule.config.max) {
              return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
            }
          }
          break;

        case 'length':
          const strValue = String(value);
          if (rule.config.min !== undefined && strValue.length < rule.config.min) {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          if (rule.config.max !== undefined && strValue.length > rule.config.max) {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          if (rule.config.exact !== undefined && strValue.length !== rule.config.exact) {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          break;

        case 'unique':
          if (!uniqueValues[rule.field]) {
            uniqueValues[rule.field] = new Set();
          }
          if (uniqueValues[rule.field].has(value)) {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          uniqueValues[rule.field].add(value);
          break;

        case 'format':
          if (!this.validateFormat(value, rule.config.format)) {
            return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
          }
          break;

        case 'custom':
          // For custom rules, evaluate the expression
          if (rule.config.expression) {
            const isValid = this.evaluateCustomRule(value, rule.config.expression);
            if (!isValid) {
              return this.createError(rowIndex, rule.field, value, rule.name, rule.errorMessage, rule.severity);
            }
          }
          break;
      }

      return null;
    } catch (error: any) {
      logger.error(`Error validating value for rule ${rule.name}:`, error);
      return null;
    }
  }

  /**
   * Validate format (email, url, phone, etc.)
   */
  private static validateFormat(value: any, format: string): boolean {
    if (!value) return true; // Skip validation for empty values

    const formats: Record<string, RegExp> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      phone: /^\+?[\d\s\-()]+$/,
      upc: /^\d{12}$/,
      ean: /^\d{13}$/,
      isbn: /^(?:\d{10}|\d{13})$/,
      zip: /^\d{5}(-\d{4})?$/,
      date: /^\d{4}-\d{2}-\d{2}$/
    };

    const regex = formats[format];
    return regex ? regex.test(String(value)) : true;
  }

  /**
   * Evaluate custom rule expression
   */
  private static evaluateCustomRule(value: any, expression: string): boolean {
    try {
      // Simple expression evaluation (can be enhanced with a proper expression parser)
      // For now, support basic comparisons
      const operators = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith'];
      
      for (const op of operators) {
        if (expression.includes(op)) {
          const [left, right] = expression.split(op).map(s => s.trim());
          const rightValue = right.replace(/['"]/g, '');

          switch (op) {
            case '==':
              return String(value) === rightValue;
            case '!=':
              return String(value) !== rightValue;
            case '>':
              return Number(value) > Number(rightValue);
            case '<':
              return Number(value) < Number(rightValue);
            case '>=':
              return Number(value) >= Number(rightValue);
            case '<=':
              return Number(value) <= Number(rightValue);
            case 'contains':
              return String(value).includes(rightValue);
            case 'startsWith':
              return String(value).startsWith(rightValue);
            case 'endsWith':
              return String(value).endsWith(rightValue);
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('Error evaluating custom rule:', error);
      return true;
    }
  }

  /**
   * Create validation error object
   */
  private static createError(
    row: number,
    field: string,
    value: any,
    rule: string,
    message: string,
    severity: 'error' | 'warning' | 'info'
  ): ValidationError {
    return {
      row: row + 1, // 1-indexed for user display
      field,
      value,
      rule,
      message,
      severity: severity === 'info' ? 'warning' : severity
    };
  }

  /**
   * Get default validation rules for common fields
   */
  static getDefaultRules(): ValidationRule[] {
    return [
      {
        name: 'UPC Format',
        description: 'Validates that UPC is a 12-digit number',
        field: 'upc',
        ruleType: 'regex',
        config: { pattern: '^\\d{12}$' },
        errorMessage: 'UPC must be a 12-digit number',
        severity: 'error',
        enabled: true
      },
      {
        name: 'UPC Unique',
        description: 'Ensures UPC values are unique',
        field: 'upc',
        ruleType: 'unique',
        config: {},
        errorMessage: 'UPC must be unique',
        severity: 'error',
        enabled: true
      },
      {
        name: 'Product Name Required',
        description: 'Product name is required',
        field: 'product_name',
        ruleType: 'required',
        config: {},
        errorMessage: 'Product name is required',
        severity: 'error',
        enabled: true
      },
      {
        name: 'Price Range',
        description: 'Price must be between 0 and 999999',
        field: 'price',
        ruleType: 'range',
        config: { min: 0, max: 999999 },
        errorMessage: 'Price must be between 0 and 999999',
        severity: 'error',
        enabled: true
      },
      {
        name: 'SKU Required',
        description: 'SKU is required',
        field: 'sku',
        ruleType: 'required',
        config: {},
        errorMessage: 'SKU is required',
        severity: 'warning',
        enabled: true
      }
    ];
  }
}

