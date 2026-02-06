import type { FastifyInstance } from 'fastify';
/**
 * App Factory Options
 */
export interface CreateAppOptions {
    /**
     * Enable request logging
     * @default true in development, false in production
     */
    logger?: boolean;
    /**
     * Enable authentication middleware
     * @default false
     */
    requireAuth?: boolean;
    /**
     * CORS configuration
     * @default disabled
     */
    cors?: {
        origin: string | string[] | boolean;
        credentials?: boolean;
    };
}
/**
 * Create and configure Fastify application
 *
 * Architecture:
 * 1. Initialize Fastify with TypeBox type provider
 * 2. Register global error handler
 * 3. Register health check routes
 * 4. Register feature plugins (LLM calls, patterns, conversions)
 * 5. Return configured instance
 *
 * @param options - Application configuration options
 * @returns Configured Fastify instance
 */
export declare function createApp(options?: CreateAppOptions): Promise<FastifyInstance>;
//# sourceMappingURL=app.d.ts.map