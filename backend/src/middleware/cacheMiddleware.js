/**
 * In-Memory Cache Middleware
 * Provides low-latency caching with TTL and tag-based / key-based invalidation.
 */

const memoryCache = new Map();

/**
 * Cache middleware for Express routes
 * @param {number} ttlSeconds - Time to live in seconds (default: 60s)
 * @param {string} cacheTag - Optional tag for grouping cached responses
 */
function cacheMiddleware(ttlSeconds = 60, cacheTag = 'default') {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Don't cache if user requested bypass
    if (req.headers['x-bypass-cache']) {
      return next();
    }

    const key = `${cacheTag}:${req.originalUrl || req.url}:${req.user?.id || 'anon'}`;
    const cachedItem = memoryCache.get(key);

    if (cachedItem && Date.now() < cachedItem.expiry) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cachedItem.data);
    }

    // Capture res.json to store response in cache
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Only cache 200 OK responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, {
          data,
          expiry: Date.now() + ttlSeconds * 1000,
          tag: cacheTag
        });
      }
      res.setHeader('X-Cache-Status', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache by tag or pattern
 * @param {string} cacheTag
 */
function invalidateCache(cacheTag) {
  if (!cacheTag) {
    memoryCache.clear();
    return;
  }
  for (const [key, item] of memoryCache.entries()) {
    if (item.tag === cacheTag || key.startsWith(`${cacheTag}:`)) {
      memoryCache.delete(key);
    }
  }
}

module.exports = {
  cacheMiddleware,
  invalidateCache
};
