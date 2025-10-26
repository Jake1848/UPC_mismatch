import { initialize } from 'unleash-client';
import logger from './logger';

interface FeatureConfig {
  name: string;
  enabled: boolean;
  variants?: Record<string, any>;
}

class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private unleash: any;
  private localFlags: Map<string, FeatureConfig> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initializeUnleash();
    this.setupLocalFlags();
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  private initializeUnleash(): void {
    const unleashUrl = process.env.UNLEASH_URL;
    const unleashToken = process.env.UNLEASH_TOKEN;

    if (unleashUrl && unleashToken) {
      try {
        this.unleash = initialize({
          url: unleashUrl,
          appName: 'upc-resolver-api',
          instanceId: process.env.HOSTNAME || 'unknown',
          environment: process.env.NODE_ENV || 'development',
          customHeaders: {
            Authorization: unleashToken,
          },
          metricsInterval: 60000,
          disableMetrics: false,
        });

        this.unleash.on('ready', () => {
          logger.info('Unleash feature flags initialized');
          this.isInitialized = true;
        });

        this.unleash.on('error', (error: Error) => {
          logger.error('Unleash error:', error);
        });

        this.unleash.on('warn', (message: string) => {
          logger.warn('Unleash warning:', message);
        });
      } catch (error) {
        logger.warn('Failed to initialize Unleash, falling back to local flags:', error);
        this.setupFallbackFlags();
      }
    } else {
      logger.info('Unleash not configured, using local feature flags');
      this.setupFallbackFlags();
    }
  }

  private setupLocalFlags(): void {
    // Define local/default feature flags
    const defaultFlags: FeatureConfig[] = [
      {
        name: 'advanced_analytics',
        enabled: process.env.NODE_ENV === 'production',
      },
      {
        name: 'real_time_notifications',
        enabled: true,
      },
      {
        name: 'bulk_conflict_resolution',
        enabled: false,
      },
      {
        name: 'ai_suggestions',
        enabled: process.env.NODE_ENV === 'production',
      },
      {
        name: 'export_large_datasets',
        enabled: true,
      },
      {
        name: 'advanced_search',
        enabled: false,
      },
      {
        name: 'organization_insights',
        enabled: true,
      },
      {
        name: 'api_rate_limiting_v2',
        enabled: false,
      },
      {
        name: 'enhanced_security_logs',
        enabled: true,
      },
      {
        name: 'performance_mode',
        enabled: false,
      },
    ];

    defaultFlags.forEach(flag => {
      this.localFlags.set(flag.name, flag);
    });
  }

  private setupFallbackFlags(): void {
    this.isInitialized = true; // Use local flags as fallback
  }

  // Check if a feature is enabled
  isEnabled(flagName: string, context?: any): boolean {
    try {
      // Try Unleash first if available
      if (this.unleash && this.isInitialized) {
        const unleashContext = {
          userId: context?.userId,
          sessionId: context?.sessionId,
          remoteAddress: context?.ip,
          environment: process.env.NODE_ENV,
          appName: 'upc-resolver-api',
          properties: {
            organizationId: context?.organizationId,
            userRole: context?.userRole,
            planType: context?.planType,
          },
        };

        return this.unleash.isEnabled(flagName, unleashContext);
      }

      // Fallback to local flags
      const flag = this.localFlags.get(flagName);
      return flag ? flag.enabled : false;
    } catch (error) {
      logger.error(`Error checking feature flag ${flagName}:`, error);

      // Fallback to local flags on error
      const flag = this.localFlags.get(flagName);
      return flag ? flag.enabled : false;
    }
  }

  // Get feature variant
  getVariant(flagName: string, context?: any): any {
    try {
      if (this.unleash && this.isInitialized) {
        const unleashContext = {
          userId: context?.userId,
          sessionId: context?.sessionId,
          remoteAddress: context?.ip,
          environment: process.env.NODE_ENV,
          appName: 'upc-resolver-api',
          properties: {
            organizationId: context?.organizationId,
            userRole: context?.userRole,
            planType: context?.planType,
          },
        };

        const variant = this.unleash.getVariant(flagName, unleashContext);
        return variant.enabled ? variant.payload : null;
      }

      // Fallback to local flags
      const flag = this.localFlags.get(flagName);
      return flag?.variants || null;
    } catch (error) {
      logger.error(`Error getting feature variant ${flagName}:`, error);
      return null;
    }
  }

  // Get all flags for a context
  getAllFlags(context?: any): Record<string, boolean> {
    const flags: Record<string, boolean> = {};

    // Get all local flag names
    const flagNames = Array.from(this.localFlags.keys());

    flagNames.forEach(flagName => {
      flags[flagName] = this.isEnabled(flagName, context);
    });

    return flags;
  }

  // Manually set a local flag (for testing)
  setLocalFlag(flagName: string, enabled: boolean, variants?: Record<string, any>): void {
    this.localFlags.set(flagName, {
      name: flagName,
      enabled,
      variants,
    });

    logger.info(`Local feature flag set: ${flagName} = ${enabled}`);
  }

  // Remove a local flag
  removeLocalFlag(flagName: string): void {
    this.localFlags.delete(flagName);
    logger.info(`Local feature flag removed: ${flagName}`);
  }

  // Get feature flag stats
  getStats(): any {
    const localFlagCount = this.localFlags.size;
    const unleashConnected = this.unleash && this.isInitialized;

    return {
      unleashConnected,
      localFlagCount,
      isInitialized: this.isInitialized,
      flags: Array.from(this.localFlags.keys()),
    };
  }

  // Graceful shutdown
  async destroy(): Promise<void> {
    if (this.unleash) {
      try {
        this.unleash.destroy();
        logger.info('Unleash feature flags destroyed');
      } catch (error) {
        logger.error('Error destroying Unleash:', error);
      }
    }
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance();

// Express middleware for feature flags
export const featureFlagMiddleware = (req: any, res: any, next: any) => {
  // Add feature flag context from request
  const context = {
    userId: req.user?.id,
    organizationId: req.user?.organizationId,
    userRole: req.user?.role,
    planType: req.user?.organization?.plan,
    ip: req.ip,
    sessionId: req.sessionID,
  };

  // Add helper methods to request object
  req.isFeatureEnabled = (flagName: string) => {
    return featureFlags.isEnabled(flagName, context);
  };

  req.getFeatureVariant = (flagName: string) => {
    return featureFlags.getVariant(flagName, context);
  };

  req.getAllFeatureFlags = () => {
    return featureFlags.getAllFlags(context);
  };

  next();
};

// Feature flag decorator for route handlers
export const requireFeature = (flagName: string) => {
  return (req: any, res: any, next: any) => {
    const context = {
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      userRole: req.user?.role,
      planType: req.user?.organization?.plan,
      ip: req.ip,
      sessionId: req.sessionID,
    };

    if (featureFlags.isEnabled(flagName, context)) {
      next();
    } else {
      res.status(404).json({
        error: 'Feature not available',
        message: `The requested feature '${flagName}' is not enabled for your account.`,
      });
    }
  };
};

// Feature flag based conditional logic helper
export const withFeature = async <T>(
  flagName: string,
  enabledCallback: () => T | Promise<T>,
  disabledCallback?: () => T | Promise<T>,
  context?: any
): Promise<T | null> => {
  if (featureFlags.isEnabled(flagName, context)) {
    return await enabledCallback();
  } else if (disabledCallback) {
    return await disabledCallback();
  }
  return null;
};

export default featureFlags;