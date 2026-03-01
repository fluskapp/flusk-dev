/**
 * CRUD route handler templates — PUT and DELETE handlers.
 */

import { toPascalCase } from '../generators/utils.js';

export function generateUpdateHandler(pascal: string): string {
  return `  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(Create${pascal}Schema),
      response: { 200: ${pascal}ResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['${pascal}'],
      description: 'Update ${pascal} by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = ${pascal}Repository.update${pascal}(fastify.db, id, request.body as Record<string, unknown>);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });`;
}

export function generateDeleteHandler(pascal: string): string {
  return `  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['${pascal}'],
      description: 'Delete ${pascal} by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = ${pascal}Repository.delete${pascal}(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });`;
}

export function buildHandlersSuffix(entityName: string): string {
  const pascal = toPascalCase(entityName);
  return `${generateUpdateHandler(pascal)}

${generateDeleteHandler(pascal)}
}
// --- END CUSTOM ---
`;
}
