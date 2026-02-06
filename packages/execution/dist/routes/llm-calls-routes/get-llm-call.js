import { Type } from '@sinclair/typebox';
import * as LLMCallRepository from '@flusk/resources/repositories/llm-call';
import { LLMCallResponseSchema } from './schemas.js';
/**
 * GET /llm-calls/:id
 * Retrieve LLM call by UUID
 */
export function registerGetLLMCall(fastify) {
    fastify.get('/:id', {
        schema: {
            params: Type.Object({
                id: Type.String({ format: 'uuid' })
            }),
            response: {
                200: LLMCallResponseSchema,
                404: Type.Object({
                    error: Type.String()
                })
            },
            tags: ['LLM Calls'],
            description: 'Get LLM call by ID'
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const llmCall = await LLMCallRepository.findById(id);
        if (!llmCall) {
            return reply.code(404).send({ error: 'LLM call not found' });
        }
        return reply.code(200).send(llmCall);
    });
}
//# sourceMappingURL=get-llm-call.js.map