const logger = require('../utils/logger');

/**
 * Search Response Caching Middleware
 * Provides in-memory caching for search responses to improve performance
 */
class SearchCache {
  constructor() {
    // In-memory cache storage
    this.cache = new Map();
    
    // Cache configuration
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default TTL
      maxCacheSize: 1000, // Maximum number of cached entries
      cleanupInterval: 10 * 60 * 1000, // Cleanup every 10 minutes
      
      // Different TTL for different endpoints
      ttlByEndpoint: {
        '/search': 5 * 60 * 1000, // 5 minutes for main search
        '/search/suggestions': 2 * 60 * 1000, // 2 minutes for suggestions
        '/search/popular': 30 * 60 * 1000, // 30 minutes for popular searches
        '/search/analytics': 15 * 60 * 1000, // 15 minutes for analytics
      }
    };

    // Start periodic cleanup
    this.startCleanupInterval();
  }

  /**
   * Generate cache key from request
   */
  generateCacheKey(req) {
    const {
      originalUrl,
      method,
      user,
      query,
      body
    } = req;

    // Include user role and ID for permission-based caching
    const userKey = user ? `${user.id}:${user.role}` : 'anonymous';
    
    // Create a deterministic key from request parameters
    const paramKey = method === 'GET' 
      ? JSON.stringify(query) 
      : JSON.stringify({ query, body });

    return `${method}:${originalUrl}:${userKey}:${paramKey}`;
  }

  /**
   * Get TTL for specific endpoint
   */
  getTTL(path) {
    // Find matching endpoint pattern
    for (const [pattern, ttl] of Object.entries(this.config.ttlByEndpoint)) {
      if (path.startsWith(pattern)) {
        return ttl;
      }
    }
    return this.config.defaultTTL;
  }

  /**
   * Check if response should be cached
   */
  shouldCache(req, res) {
    // Don't cache if not GET request or if it's for advanced search
    if (req.method !== 'GET' && !req.originalUrl.includes('/search/advanced')) {
      return false;
    }

    // Don't cache if response has errors
    if (res.statusCode !== 200) {
      return false;
    }

    // Don't cache if user-specific data that shouldn't be shared
    if (req.originalUrl.includes('/saved') || req.originalUrl.includes('/history')) {
      return false;
    }

    return true;
  }

  /**
   * Get cached response
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU-like behavior
    cached.lastAccessed = Date.now();
    
    return cached.data;
  }

  /**
   * Store response in cache
   */
  set(key, data, ttl) {
    // Check cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
  }

  /**
   * Evict oldest entries when cache is full
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      logger.info(`Search cache: Cleared ${clearedCount} expired entries`);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanupInterval() {
    setInterval(() => {
      this.clearExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    logger.info('Search cache: All entries cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, value] of this.cache.entries()) {
      totalSize += JSON.stringify(value.data).length;
      if (now > value.expiresAt) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      approximateSize: totalSize,
      maxSize: this.config.maxCacheSize,
      hitRate: this.hitRate || 0
    };
  }
}

// Create singleton instance
const searchCache = new SearchCache();

/**
 * Express middleware for search response caching
 */
const searchCacheMiddleware = (options = {}) => {
  return (req, res, next) => {
    // Skip caching in development if specified
    if (process.env.NODE_ENV === 'development' && options.skipInDev) {
      return next();
    }

    const cacheKey = searchCache.generateCacheKey(req);
    
    // Try to get cached response
    const cachedResponse = searchCache.get(cacheKey);
    
    if (cachedResponse) {
      logger.debug(`Search cache hit: ${req.originalUrl}`);
      return res.json(cachedResponse);
    }

    // Store original res.json function
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Only cache if conditions are met
      if (searchCache.shouldCache(req, res)) {
        const ttl = searchCache.getTTL(req.path);
        searchCache.set(cacheKey, data, ttl);
        logger.debug(`Search cache set: ${req.originalUrl} (TTL: ${ttl}ms)`);
      }
      
      // Call original json function
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to clear cache for specific patterns
 */
const clearCacheMiddleware = (patterns = []) => {
  return (req, res, next) => {
    // Clear cache entries matching patterns after the response
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          for (const [key] of searchCache.cache.entries()) {
            if (key.includes(pattern)) {
              searchCache.cache.delete(key);
            }
          }
        });
      }
    });

    next();
  };
};

module.exports = {
  searchCache,
  searchCacheMiddleware,
  clearCacheMiddleware
};