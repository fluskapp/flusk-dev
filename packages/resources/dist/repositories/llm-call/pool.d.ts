import { Pool } from 'pg';
/**
 * Get or create PostgreSQL connection pool
 * Uses DATABASE_URL environment variable
 */
export declare function getPool(): Pool;
/**
 * Close database connection pool (for graceful shutdown)
 */
export declare function closePool(): Promise<void>;
//# sourceMappingURL=pool.d.ts.map