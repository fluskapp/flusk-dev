import { Pool } from 'pg';
/**
 * PostgreSQL connection pool singleton
 */
let pool = null;
/**
 * Get or create PostgreSQL connection pool
 * Uses DATABASE_URL environment variable
 */
export function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });
        pool.on('error', (err) => {
            console.error('Unexpected database error:', err);
        });
    }
    return pool;
}
/**
 * Close database connection pool (for graceful shutdown)
 */
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=pool.js.map