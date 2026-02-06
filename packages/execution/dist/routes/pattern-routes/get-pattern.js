import { Type } from '@sinclair/typebox';
import * as PatternRepository from '@flusk/resources/repositories/pattern';
import { PatternResponseSchema } from './schemas.js';
/**
 * GET /patterns/:id
 * Retrieve pattern by UUID
 */
export function registerGetPattern(fastify) {
    fastify.get('/:id', {
        schema: {
            params: Type.Object({
                id: Type.String({ format: 'uuid' })
            }),
            response: {
                200: PatternResponseSchema,
                404: Type.Object({
                    error: Type.String()
                })
            },
            tags: ['Patterns'],
            description: 'Get pattern by ID'
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const pattern = await PatternRepository.findById(id);
        if (!pattern) {
            return reply.code(404).send({ error: 'Pattern not found' });
        }
        return reply.code(200).send(pattern);
    });
}
//# sourceMappingURL=get-pattern.js.map