import logger from './logger';

interface EnvConfig {
  required: string[];
  optional?: string[];
}

export class EnvValidator {
  private static instance: EnvValidator;
  private validated = false;

  private constructor() {}

  static getInstance(): EnvValidator {
    if (!EnvValidator.instance) {
      EnvValidator.instance = new EnvValidator();
    }
    return EnvValidator.instance;
  }

  validateRequired(config: EnvConfig): void {
    if (this.validated) return;

    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    config.required.forEach(key => {
      if (!process.env[key] || process.env[key]?.trim() === '') {
        missing.push(key);
      }
    });

    // Check optional variables
    config.optional?.forEach(key => {
      if (!process.env[key]) {
        warnings.push(key);
      }
    });

    // Log warnings for optional variables
    if (warnings.length > 0) {
      logger.warn('Optional environment variables not set:', warnings);
    }

    // Throw error if required variables are missing
    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    // Validate specific formats
    this.validateFormats();

    this.validated = true;
    logger.info('Environment variables validated successfully');
  }

  private validateFormats(): void {
    // Validate DATABASE_URL format
    if (process.env.DATABASE_URL && !this.isValidDatabaseUrl(process.env.DATABASE_URL)) {
      throw new Error('Invalid DATABASE_URL format');
    }

    // Validate PORT is a number
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
      throw new Error('PORT must be a valid number');
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'test', 'production', 'staging'];
    if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
      throw new Error(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
    }

    // Validate JWT_EXPIRES_IN format
    if (process.env.JWT_EXPIRES_IN && !this.isValidDuration(process.env.JWT_EXPIRES_IN)) {
      throw new Error('JWT_EXPIRES_IN must be a valid duration (e.g., 1d, 24h, 60m)');
    }
  }

  private isValidDatabaseUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['postgresql', 'postgres', 'mysql', 'mongodb'].some(
        protocol => parsed.protocol.startsWith(protocol)
      );
    } catch {
      return false;
    }
  }

  private isValidDuration(duration: string): boolean {
    return /^\d+[dhms]$/.test(duration);
  }
}

// Export singleton instance
export const envValidator = EnvValidator.getInstance();

// Export the configuration for the app
export const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_BUCKET_NAME',
    'REDIS_URL',
    'FRONTEND_URL',
    'BACKEND_URL'
  ],
  optional: [
    'PORT',
    'NODE_ENV',
    'JWT_EXPIRES_IN',
    'LOG_LEVEL',
    'SENTRY_DSN',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'ADMIN_EMAIL'
  ]
};