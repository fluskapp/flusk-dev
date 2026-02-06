import type { FastifyReply, FastifyRequest } from 'fastify';
/**
 * Auth Middleware
 * Validates API keys and extracts organizationId
 *
 * API Key format: orgId_secretKey
 * Example: org_123_abc456def789
 *
 * Decorates request with:
 * - organizationId: string
 */
declare module 'fastify' {
    interface FastifyRequest {
        organizationId: string;
    }
}
/**
 * Authentication hook
 * Validates Authorization header and extracts organization ID
 */
export declare function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void>;
/**
 * Optional authentication hook
 * Validates API key if present, but allows requests without it
 */
export declare function optionalAuthMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map