import { Type } from '@sinclair/typebox';
import * as PatternRepository from '@flusk/resources/repositories/pattern';
import { PatternResponseSchema, PatternQuerySchema } from './schemas.js';
/**
 * GET /patterns
 * List all patterns with optional filtering
 */
export function registerListPatterns(fastify) {
    fastify.get('/', {
        schema: {
            querystring: PatternQuerySchema,
            response: {
                200: Type.Object({
                    patterns: Type.Array(PatternResponseSchema),
                    total: Type.Integer({ minimum: 0 })
                })
            },
            tags: ['Patterns'],
            description: 'List patterns with optional filters'
        }
    }, async (request, reply) => {
        const query = request.query;
        let patterns;
        if (query.organizationId) {
            // Filter by organization
            patterns = await PatternRepository.findByOrganization(query.organizationId, {
                minOccurrences: query.minOccurrences,
                minTotalCost: query.minTotalCost,
                sortBy: query.sortBy,
                limit: query.limit,
                offset: query.offset
            });
        }
        else {
            // Get all patterns
            patterns = await PatternRepository.findMany(query.limit || 100, query.offset || 0);
        }
        return reply.code(200).send({
            patterns,
            total: patterns.length
        });
    });
}
//# sourceMappingURL=list-patterns.js.map