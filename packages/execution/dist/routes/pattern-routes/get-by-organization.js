import { Type } from '@sinclair/typebox';
import * as PatternRepository from '@flusk/resources/repositories/pattern';
import { PatternResponseSchema } from './schemas.js';
/**
 * GET /patterns/by-organization/:orgId
 * List patterns for a specific organization
 * Convenience endpoint for common use case
 */
export function registerGetByOrganization(fastify) {
    fastify.get('/by-organization/:orgId', {
        schema: {
            params: Type.Object({
                orgId: Type.String({ format: 'uuid' })
            }),
            querystring: Type.Object({
                minOccurrences: Type.Optional(Type.Integer({ minimum: 1 })),
                minTotalCost: Type.Optional(Type.Number({ minimum: 0 })),
                sortBy: Type.Optional(Type.Union([
                    Type.Literal('occurrences'),
                    Type.Literal('totalCost'),
                    Type.Literal('lastSeen')
                ])),
                limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
                offset: Type.Optional(Type.Integer({ minimum: 0 }))
            }),
            response: {
                200: Type.Object({
                    patterns: Type.Array(PatternResponseSchema),
                    total: Type.Integer({ minimum: 0 })
                })
            },
            tags: ['Patterns'],
            description: 'Get patterns for an organization with filters'
        }
    }, async (request, reply) => {
        const { orgId } = request.params;
        const query = request.query;
        const patterns = await PatternRepository.findByOrganization(orgId, query);
        return reply.code(200).send({
            patterns,
            total: patterns.length
        });
    });
}
//# sourceMappingURL=get-by-organization.js.map