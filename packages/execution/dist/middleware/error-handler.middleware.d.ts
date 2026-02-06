import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
/**
 * Global error handler for Fastify
 * Attaches to setErrorHandler hook
 */
export declare function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): Promise<void>;
//# sourceMappingURL=error-handler.middleware.d.ts.map