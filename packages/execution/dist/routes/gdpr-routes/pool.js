import { Pool } from 'pg';
/**
 * PostgreSQL connection pool singleton for GDPR operations
 */
let pool = null;
export function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({ connectionString });
    }
    return pool;
}
//# sourceMappingURL=pool.js.map