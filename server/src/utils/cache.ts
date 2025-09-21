import Redis from 'ioredis';
import logger from './logger';

class CacheManager {
  private static instance: CacheManager;
  private redis: Redis;
  private isConnected = false;

  private constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      keyPrefix: 'upc-resolver:',
      family: 4, // IPv4
    });

    this.setupEventHandlers();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('✅ Redis cache connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null;

      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // Specialized caching methods
  async cacheUserSession(userId: string, sessionData: any, ttlSeconds: number = 3600): Promise<void> {
    await this.set(`session:${userId}`, sessionData, ttlSeconds);
  }

  async getUserSession(userId: string): Promise<any> {
    return this.get(`session:${userId}`);
  }

  async invalidateUserSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`);
  }

  // Organization data caching
  async cacheOrganization(orgId: string, orgData: any, ttlSeconds: number = 1800): Promise<void> {
    await this.set(`org:${orgId}`, orgData, ttlSeconds);
  }

  async getOrganization(orgId: string): Promise<any> {
    return this.get(`org:${orgId}`);
  }

  async invalidateOrganization(orgId: string): Promise<void> {
    await this.del(`org:${orgId}`);
  }

  // Analysis results caching
  async cacheAnalysisStats(analysisId: string, stats: any, ttlSeconds: number = 600): Promise<void> {
    await this.set(`analysis:stats:${analysisId}`, stats, ttlSeconds);
  }

  async getAnalysisStats(analysisId: string): Promise<any> {
    return this.get(`analysis:stats:${analysisId}`);
  }

  // Conflict resolution suggestions caching
  async cacheResolutionSuggestions(conflictId: string, suggestions: any, ttlSeconds: number = 900): Promise<void> {
    await this.set(`suggestions:${conflictId}`, suggestions, ttlSeconds);
  }

  async getResolutionSuggestions(conflictId: string): Promise<any> {
    return this.get(`suggestions:${conflictId}`);
  }

  // API response caching
  async cacheApiResponse(endpoint: string, params: any, response: any, ttlSeconds: number = 300): Promise<void> {
    const cacheKey = this.generateApiCacheKey(endpoint, params);
    await this.set(cacheKey, response, ttlSeconds);
  }

  async getApiResponse(endpoint: string, params: any): Promise<any> {
    const cacheKey = this.generateApiCacheKey(endpoint, params);
    return this.get(cacheKey);
  }

  private generateApiCacheKey(endpoint: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as any);

    const paramString = Buffer.from(JSON.stringify(sortedParams)).toString('base64');
    return `api:${endpoint}:${paramString}`;
  }

  // Batch operations
  async mget(keys: string[]): Promise<Array<any | null>> {
    try {
      if (!this.isConnected) return new Array(keys.length).fill(null);

      const values = await this.redis.mget(...keys);
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const pipeline = this.redis.pipeline();

      keyValuePairs.forEach(({ key, value, ttl = 300 }) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  // Pattern-based operations
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;

      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  // Rate limiting
  async incrementCounter(key: string, windowSeconds: number = 60): Promise<number> {
    try {
      if (!this.isConnected) return 0;

      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      if (!this.isConnected) return null;

      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      return {
        connected: this.isConnected,
        memory: this.parseMemoryInfo(info),
        keyspace: this.parseKeyspaceInfo(keyspace)
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      return null;
    }
  }

  private parseMemoryInfo(info: string): any {
    const lines = info.split('\r\n');
    const memory: any = {};

    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key.includes('memory')) {
          memory[key] = value;
        }
      }
    });

    return memory;
  }

  private parseKeyspaceInfo(info: string): any {
    const lines = info.split('\r\n');
    const keyspace: any = {};

    lines.forEach(line => {
      if (line.includes('db') && line.includes(':')) {
        const [db, stats] = line.split(':');
        keyspace[db] = stats;
      }
    });

    return keyspace;
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

// Cache middleware for Express routes
export const cacheMiddleware = (ttlSeconds: number = 300) => {
  return async (req: any, res: any, next: any) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = cache['generateApiCacheKey'](req.path, {
        ...req.query,
        ...req.params,
        userId: req.user?.id,
        organizationId: req.user?.organizationId
      });

      const cachedResponse = await cache.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache hit for ${req.path}`);
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data: any) {
        cache.set(cacheKey, data, ttlSeconds);
        logger.debug(`Cached response for ${req.path}`);
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

export default cache;