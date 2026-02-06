import { Type } from '@sinclair/typebox';
import * as LLMCallRepository from '@flusk/resources/repositories/llm-call';
import { LLMCallResponseSchema } from './schemas.js';
/**
 * GET /llm-calls/by-hash/:hash
 * Check cache by prompt hash
 * Returns most recent LLM call with matching hash
 */
export function registerGetByHash(fastify) {
    fastify.get('/by-hash/:hash', {
        schema: {
            params: Type.Object({
                hash: Type.String({ minLength: 64, maxLength: 64 })
            }),
            response: {
                200: LLMCallResponseSchema,
                404: Type.Object({
                    error: Type.String()
                })
            },
            tags: ['LLM Calls'],
            description: 'Find LLM call by prompt hash (cache lookup)'
        }
    }, async (request, reply) => {
        const { hash } = request.params;
        const llmCall = await LLMCallRepository.findByPromptHash(hash);
        if (!llmCall) {
            return reply.code(404).send({ error: 'No cached response found for this hash' });
        }
        return reply.code(200).send(llmCall);
    });
}
//# sourceMappingURL=get-by-hash.js.map