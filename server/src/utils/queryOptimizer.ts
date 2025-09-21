import { Prisma } from '@prisma/client';

// Query optimization utilities
export class QueryOptimizer {

  // Optimized conflict query with proper relations
  static getConflictsWithRelations() {
    return {
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        analysis: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            status: true,
            createdAt: true
          }
        },
        // Preload related data that might be needed for suggestions
        _count: {
          select: {
            resolutionHistory: true
          }
        }
      }
    } as const;
  }

  // Optimized analysis query
  static getAnalysisWithRelations() {
    return {
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            conflicts: true
          }
        }
      }
    } as const;
  }

  // Optimized user query with organization
  static getUserWithOrganization() {
    return {
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            maxUsers: true,
            maxProducts: true,
            settings: true,
            billingEmail: true,
            subscriptionStatus: true,
            trialEndsAt: true
          }
        }
      }
    } as const;
  }

  // Batch query utility for multiple IDs
  static async batchQuery<T>(
    model: any,
    ids: string[],
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await model.findMany({
        where: {
          id: { in: batch }
        }
      });
      results.push(...batchResults);
    }

    return results;
  }

  // Optimized pagination with cursor
  static getPaginationConfig(
    page?: number,
    limit?: number,
    cursor?: string
  ) {
    const take = Math.min(limit || 20, 100); // Max 100 items per page

    if (cursor) {
      // Cursor-based pagination (more efficient for large datasets)
      return {
        take,
        cursor: { id: cursor },
        skip: 1 // Skip the cursor item
      };
    } else {
      // Offset-based pagination
      const skip = ((page || 1) - 1) * take;
      return { take, skip };
    }
  }

  // Create optimized where clause for text search
  static createSearchWhere(searchTerm?: string, searchFields: string[] = []) {
    if (!searchTerm || searchFields.length === 0) {
      return {};
    }

    const conditions = searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const
      }
    }));

    return {
      OR: conditions
    };
  }

  // Optimized sorting configuration
  static createOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    defaultSort: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }
  ) {
    if (!sortBy) {
      return defaultSort;
    }

    return { [sortBy]: sortOrder };
  }

  // Memory-efficient aggregation queries
  static async getAggregatedStats(
    prisma: any,
    organizationId: string
  ) {
    // Use raw SQL for complex aggregations to avoid memory issues
    const stats = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total_conflicts,
        COUNT(CASE WHEN status = 'NEW' THEN 1 END) as new_conflicts,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_conflicts,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_conflicts,
        AVG(CASE WHEN resolved_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600
            END) as avg_resolution_time_hours
      FROM conflicts
      WHERE organization_id = ${organizationId}
    `;

    return stats[0];
  }

  // Bulk update utility with batch processing
  static async bulkUpdate(
    model: any,
    updates: Array<{ id: string; data: any }>,
    batchSize: number = 50
  ) {
    const results = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      const batchPromises = batch.map(({ id, data }) =>
        model.update({
          where: { id },
          data
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // Optimized conflict resolution suggestions without additional queries
  static generateOptimizedResolutionSuggestions(conflict: any) {
    const suggestions = [];

    // Use preloaded data instead of making new queries
    if (conflict.type === 'DUPLICATE_UPC') {
      suggestions.push({
        type: 'MERGE_PRODUCTS',
        confidence: 0.9,
        description: 'Merge duplicate products with same UPC',
        action: 'merge',
        details: {
          primaryProduct: conflict.productIds?.[0],
          duplicateProducts: conflict.productIds?.slice(1) || []
        }
      });
    }

    if (conflict.type === 'MULTI_UPC_PRODUCT') {
      suggestions.push({
        type: 'SELECT_PRIMARY_UPC',
        confidence: 0.8,
        description: 'Select primary UPC for product',
        action: 'select_primary',
        details: {
          productId: conflict.productId,
          upcs: conflict.upcs || []
        }
      });
    }

    // Add time-based suggestions using preloaded count data
    if (conflict._count?.resolutionHistory > 0) {
      suggestions.push({
        type: 'APPLY_PREVIOUS_RESOLUTION',
        confidence: 0.7,
        description: 'Apply similar resolution from history',
        action: 'apply_previous'
      });
    }

    return suggestions;
  }
}

export default QueryOptimizer;