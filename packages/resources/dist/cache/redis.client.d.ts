import Redis from 'ioredis';
/**
 * Get or create Redis connection singleton
 * Uses REDIS_URL environment variable or defaults to localhost
 */
export declare function getConnection(): Redis;
/**
 * Cache an LLM response by prompt hash
 * @param hash - SHA-256 hash of the prompt
 * @param response - LLM response text to cache
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export declare function cacheResponse(hash: string, response: string, ttl?: number): Promise<void>;
/**
 * Get cached LLM response by prompt hash
 * @param hash - SHA-256 hash of the prompt
 * @returns Cached response string or null if not found
 */
export declare function getCachedResponse(hash: string): Promise<string | null>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare function closeConnection(): Promise<void>;
//# sourceMappingURL=redis.client.d.ts.map