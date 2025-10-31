/**
 * Cache Service for Timesheet Manager
 * Provides Redis-based caching with fallback to in-memory cache
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

interface CacheItem {
  value: any;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 1000; // Maximum number of items in memory cache

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000)
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

class RedisCache {
  private redis: any;
  private memoryFallback: MemoryCache;
  private redisAvailable = false;

  constructor() {
    this.memoryFallback = new MemoryCache();
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Try to import Redis (will work in production)
      const Redis = (await import('ioredis')).default;
      
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        } as any);

        this.redis.on('error', (err: any) => {
          console.warn('Redis connection error, falling back to memory cache:', err.message);
          this.redisAvailable = false;
        });

        this.redis.on('connect', () => {
          console.log('Redis connected successfully');
          this.redisAvailable = true;
        });

        // Test connection
        await this.redis.ping();
        this.redisAvailable = true;
      }
    } catch (error) {
      console.warn('Redis not available, using memory cache fallback:', error);
      this.redisAvailable = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redisAvailable && this.redis) {
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
      }
    } catch (error) {
      console.warn('Redis get failed, falling back to memory cache:', error);
      this.redisAvailable = false;
    }

    // Fallback to memory cache
    return this.memoryFallback.get<T>(key);
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      if (this.redisAvailable && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
        return;
      }
    } catch (error) {
      console.warn('Redis set failed, falling back to memory cache:', error);
      this.redisAvailable = false;
    }

    // Fallback to memory cache
    return this.memoryFallback.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redisAvailable && this.redis) {
        await this.redis.del(key);
        return;
      }
    } catch (error) {
      console.warn('Redis delete failed, falling back to memory cache:', error);
      this.redisAvailable = false;
    }

    // Fallback to memory cache
    return this.memoryFallback.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      if (this.redisAvailable && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      }
    } catch (error) {
      console.warn('Redis invalidate failed, falling back to memory cache:', error);
      this.redisAvailable = false;
    }

    // Fallback to memory cache
    return this.memoryFallback.invalidate(pattern);
  }

  async clear(): Promise<void> {
    try {
      if (this.redisAvailable && this.redis) {
        await this.redis.flushdb();
        return;
      }
    } catch (error) {
      console.warn('Redis clear failed, falling back to memory cache:', error);
      this.redisAvailable = false;
    }

    // Fallback to memory cache
    return this.memoryFallback.clear();
  }

  async healthCheck(): Promise<{ status: string; type: string; details?: any }> {
    if (this.redisAvailable && this.redis) {
      try {
        const start = Date.now();
        await this.redis.ping();
        const latency = Date.now() - start;
        
        return {
          status: 'healthy',
          type: 'redis',
          details: { latency: `${latency}ms` }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          type: 'redis',
          details: { error: (error as any).message }
        };
      }
    }

    return {
      status: 'healthy',
      type: 'memory',
      details: { 
        size: this.memoryFallback['cache'].size,
        maxSize: this.memoryFallback['maxSize']
      }
    };
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    if (!cacheInstance) {
      cacheInstance = new RedisCache();
    }
    return cacheInstance.get<T>(key);
  },

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!cacheInstance) {
      cacheInstance = new RedisCache();
    }
    return cacheInstance.set(key, value, ttl);
  },

  async delete(key: string): Promise<void> {
    if (!cacheInstance) {
      cacheInstance = new RedisCache();
    }
    return cacheInstance.delete(key);
  },

  async invalidate(pattern: string): Promise<void> {
    if (!cacheInstance) {
      cacheInstance = new RedisCache();
    }
    return cacheInstance.invalidate(pattern);
  },

  async clear(): Promise<void> {
    if (!cacheInstance) {
      cacheInstance = new RedisCache();
    }
    return cacheInstance.clear();
  },

  async healthCheck() {
    if (!cacheInstance) {
      cacheInstance = new RedisCache();
    }
    return cacheInstance.healthCheck();
  },

  // Utility methods for cache keys
  makeKey(parts: string[]): string {
    return parts.filter(Boolean).join(':');
  },

  makePattern(prefix: string, suffix: string = '*'): string {
    return `${prefix}:${suffix}`;
  }
};

// Cache decorators for functions
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyPrefix: string;
    ttl?: number;
    keyBuilder?: (...args: Parameters<T>) => string;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = options.keyBuilder 
      ? options.keyBuilder(...args)
      : `${options.keyPrefix}:${JSON.stringify(args)}`;

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Cache the result
    await cacheService.set(cacheKey, result, options.ttl || 3600);

    return result;
  }) as T;
}

// Cache invalidation patterns for common operations
export const CACHE_PATTERNS = {
  TIMESHEETS: 'timesheets:*',
  EMPLOYEES: 'employees:*',
  REPORTS: 'reports:*',
  MANAGER_PENDING: 'manager_pending_timesheets:*',
  USER_PROFILE: 'user_profile:*',
  DASHBOARD_METRICS: 'dashboard_metrics:*'
} as const;

export default cacheService;