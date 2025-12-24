/**
 * API Request Cache and Deduplication Utility
 * Prevents duplicate requests and caches responses for better performance
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 30000; // 30 seconds default cache TTL

/**
 * Get cached data if available and not expired
 */
function getCached(key: string, ttl: number = DEFAULT_TTL): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Set cache entry
 */
function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Create a cache key from URL and options
 */
function createCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Cached fetch with request deduplication
 * If the same request is made multiple times, it will return the same promise
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl: number = DEFAULT_TTL
): Promise<Response> {
  const cacheKey = createCacheKey(url, options);
  
  // Check cache first (only for GET requests)
  if (!options?.method || options.method === 'GET') {
    const cached = getCached(cacheKey, ttl);
    if (cached !== null) {
      // Return a new Response-like object with cached data
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check if there's an ongoing request for this key
    const entry = cache.get(cacheKey);
    if (entry?.promise) {
      return entry.promise;
    }
  }
  
  // Create fetch promise
  const fetchPromise = fetch(url, options).then(async (response) => {
    if (response.ok && (!options?.method || options.method === 'GET')) {
      const data = await response.clone().json();
      setCache(cacheKey, data);
    }
    return response;
  });
  
  // Store promise for deduplication (only for GET requests)
  if (!options?.method || options.method === 'GET') {
    const entry = cache.get(cacheKey) || { data: null, timestamp: 0 };
    entry.promise = fetchPromise;
    cache.set(cacheKey, entry);
    
    // Clean up promise after request completes
    fetchPromise.finally(() => {
      const entry = cache.get(cacheKey);
      if (entry) {
        delete entry.promise;
      }
    });
  }
  
  return fetchPromise;
}

/**
 * Clear cache for a specific URL pattern or all cache
 */
export function clearCache(urlPattern?: string): void {
  if (!urlPattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

