import CircuitBreaker from 'opossum';
import logger from './logger';

interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

class CircuitBreakerFactory {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  static create<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: CircuitBreakerOptions = {}
  ): CircuitBreaker {
    const defaultOptions = {
      timeout: 10000, // 10 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      ...options
    };

    const breaker = new CircuitBreaker(fn, defaultOptions);

    // Log circuit breaker events
    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened: ${options.name || 'unnamed'}`);
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open: ${options.name || 'unnamed'}`);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker closed: ${options.name || 'unnamed'}`);
    });

    breaker.on('timeout', () => {
      logger.error(`Circuit breaker timeout: ${options.name || 'unnamed'}`);
    });

    breaker.on('reject', () => {
      logger.warn(`Circuit breaker rejected request: ${options.name || 'unnamed'}`);
    });

    breaker.on('fallback', (data) => {
      logger.info(`Circuit breaker fallback executed: ${options.name || 'unnamed'}`, data);
    });

    if (options.name) {
      this.breakers.set(options.name, breaker);
    }

    return breaker;
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  static getStats(name?: string): any {
    if (name) {
      const breaker = this.breakers.get(name);
      return breaker ? breaker.stats : null;
    }

    const stats: { [key: string]: any } = {};
    this.breakers.forEach((breaker, key) => {
      stats[key] = breaker.stats;
    });
    return stats;
  }

  static reset(name?: string): void {
    if (name) {
      const breaker = this.breakers.get(name);
      if (breaker) {
        breaker.close();
        logger.info(`Circuit breaker reset: ${name}`);
      }
    } else {
      this.breakers.forEach((breaker, key) => {
        breaker.close();
        logger.info(`Circuit breaker reset: ${key}`);
      });
    }
  }
}

// Specific circuit breakers for external services

// Stripe circuit breaker
export const stripeCircuitBreaker = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  return CircuitBreakerFactory.create(fn, {
    name: 'stripe',
    timeout: 15000,
    errorThresholdPercentage: 30,
    resetTimeout: 60000
  });
};

// AWS S3 circuit breaker
export const s3CircuitBreaker = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  return CircuitBreakerFactory.create(fn, {
    name: 's3',
    timeout: 30000,
    errorThresholdPercentage: 40,
    resetTimeout: 45000
  });
};

// External API circuit breaker
export const externalApiCircuitBreaker = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  return CircuitBreakerFactory.create(fn, {
    name: 'external-api',
    timeout: 20000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  });
};

// Email service circuit breaker
export const emailCircuitBreaker = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  return CircuitBreakerFactory.create(fn, {
    name: 'email',
    timeout: 10000,
    errorThresholdPercentage: 60,
    resetTimeout: 20000
  });
};

export { CircuitBreakerFactory };
export default CircuitBreakerFactory;