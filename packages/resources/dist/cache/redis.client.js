import Redis from 'ioredis';
/**
 * Redis client singleton for Flusk cache operations
 * Handles LLM response caching and deduplication
 */
let redisClient = null;
/**
 * Get or create Redis connection singleton
 * Uses REDIS_URL environment variable or defaults to localhost
 */
export function getConnection() {
    if (!redisClient) {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            lazyConnect: false
        });
        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
        redisClient.on('connect', () => {
            console.log('Redis connected successfully');
        });
    }
    return redisClient;
}
/**
 * Cache an LLM response by prompt hash
 * @param hash - SHA-256 hash of the prompt
 * @param response - LLM response text to cache
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export async function cacheResponse(hash, response, ttl = 86400) {
    const redis = getConnection();
    const key = `llm:response:${hash}`;
    await redis.setex(key, ttl, response);
}
/**
 * Get cached LLM response by prompt hash
 * @param hash - SHA-256 hash of the prompt
 * @returns Cached response string or null if not found
 */
export async function getCachedResponse(hash) {
    const redis = getConnection();
    const key = `llm:response:${hash}`;
    return await redis.get(key);
}
/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeConnection() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
//# sourceMappingURL=redis.client.js.map