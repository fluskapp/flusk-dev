import type { FastifyInstance } from 'fastify';
/**
 * POST /llm-calls
 * Create new LLM call record
 * Hooks: hashPrompt → checkCache → calculateCost → cacheResponse
 */
export declare function registerCreateLLMCall(fastify: FastifyInstance): void;
//# sourceMappingURL=create-llm-call.d.ts.map