import type { FastifyInstance } from 'fastify';
/**
 * Audit Logging Plugin
 * Logs all API requests for SOC2 compliance
 *
 * Logs:
 * - HTTP method and path
 * - Organization ID (from auth)
 * - IP address and user agent
 * - Request outcome (success/error)
 */
export declare function auditPlugin(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=audit.middleware.d.ts.map