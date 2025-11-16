/**
 * API Response Cache Utility
 * 
 * Provides client-side caching for API responses to reduce network requests
 * and improve performance.
 */

class ApiCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 100; // Maximum number of cached items
  }

  /**
   * Generate cache key from URL and options
   */
  getKey(url, options = {}) {
    const params = new URLSearchParams(options.params || {});
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    
    return `${url}${sortedParams ? `?${sortedParams}` : ""}`;
  }

  /**
   * Get cached response
   */
  get(url, options = {}) {
    const key = this.getKey(url, options);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached response
   */
  set(url, data, options = {}) {
    const key = this.getKey(url, options);
    const ttl = options.ttl || this.defaultTTL;

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(url, options = {}) {
    const key = this.getKey(url, options);
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

// Create singleton instance
const apiCache = new ApiCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
});

// Clean up expired entries every minute
if (typeof window !== "undefined") {
  setInterval(() => {
    apiCache.clearExpired();
  }, 60 * 1000);
}

/**
 * Cached fetch wrapper
 * 
 * @param {string} url - Request URL
 * @param {object} options - Fetch options and cache options
 * @returns {Promise<Response>}
 */
export async function cachedFetch(url, options = {}) {
  const {
    cache = true,
    cacheTTL,
    method = "GET",
    ...fetchOptions
  } = options;

  // Only cache GET requests
  if (cache && method === "GET") {
    const cached = apiCache.get(url, options);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Make actual request
  const response = await fetch(url, {
    method,
    ...fetchOptions,
  });

  // Cache successful GET responses
  if (cache && method === "GET" && response.ok) {
    try {
      const data = await response.clone().json();
      apiCache.set(url, data, { ttl: cacheTTL });
    } catch (e) {
      // Not JSON, don't cache
    }
  }

  return response;
}

/**
 * Invalidate cache for a URL pattern
 */
export function invalidateCache(urlPattern) {
  if (typeof urlPattern === "string") {
    // Exact match
    apiCache.clear(urlPattern);
  } else if (urlPattern instanceof RegExp) {
    // Pattern match
    for (const key of apiCache.cache.keys()) {
      if (urlPattern.test(key)) {
        apiCache.cache.delete(key);
      }
    }
  }
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  apiCache.clearAll();
}

export default apiCache;

