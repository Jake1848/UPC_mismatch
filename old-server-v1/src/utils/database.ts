import { PrismaClient } from '@prisma/client';
import logger from './logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private prisma: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' },
      ],
    });

    // Set up event listeners
    this.prisma.$on('error' as never, (e: any) => {
      logger.error('Prisma error:', e);
    });

    this.prisma.$on('warn' as never, (e: any) => {
      logger.warn('Prisma warning:', e);
    });

    this.prisma.$on('info' as never, (e: any) => {
      logger.info('Prisma info:', e);
    });
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connectWithRetry(maxRetries = 5, retryDelay = 5000): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Database connection attempt ${attempt} of ${maxRetries}`);
        await this.prisma.$connect();
        this.isConnected = true;
        logger.info('✅ Database connected successfully');

        // Set up graceful shutdown
        this.setupGracefulShutdown();
        return;
      } catch (error) {
        logger.error(`Database connection attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          logger.error('❌ Failed to connect to database after maximum retries');
          throw new Error('Unable to connect to database');
        }

        logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Exponential backoff
        retryDelay = Math.min(retryDelay * 1.5, 30000);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  getClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connectWithRetry() first.');
    }
    return this.prisma;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, closing database connection...`);
        await this.disconnect();
        process.exit(0);
      });
    });
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export the Prisma client getter for backward compatibility
export const getPrismaClient = () => db.getClient();