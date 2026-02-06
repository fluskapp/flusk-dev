import { registerCreateLLMCall } from './create-llm-call.js';
import { registerGetLLMCall } from './get-llm-call.js';
import { registerGetByHash } from './get-by-hash.js';
/**
 * Register LLM call routes
 * Implements REST endpoints with hook-based composition
 */
export async function llmCallsRoutes(fastify) {
    registerCreateLLMCall(fastify);
    registerGetLLMCall(fastify);
    registerGetByHash(fastify);
}
//# sourceMappingURL=index.js.map