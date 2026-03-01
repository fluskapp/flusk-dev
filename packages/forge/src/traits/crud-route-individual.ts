/**
 * Individual CRUD route builder functions.
 */

export function buildRoutePost(n: string): string {
  return [
    `  fastify.post('/', {`,
    `    schema: {`,
    `      body: Create${n}Schema,`,
    `      response: { 201: ${n}ResponseSchema as unknown as TSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Create a new ${n} record',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema`,
    `    const created = ${n}Repository.create${n}(fastify.db, request.body as Record<string, unknown>);`,
    `    return reply.code(201).send(created);`,
    `  });`,
  ].join('\n');
}

export function buildRouteGetById(n: string): string {
  return [
    `  fastify.get('/:id', {`,
    `    schema: {`,
    `      params: IdParamsSchema,`,
    `      response: { 200: ${n}ResponseSchema as unknown as TSchema, 404: NotFoundSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Get a ${n} by ID',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { id } = request.params as { id: string };`,
    `    const entity = ${n}Repository.find${n}ById(fastify.db, id);`,
    `    if (!entity) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(200).send(entity);`,
    `  });`,
  ].join('\n');
}

export function buildRouteList(n: string): string {
  return [
    `  fastify.get('/', {`,
    `    schema: {`,
    `      querystring: ListQuerySchema,`,
    `      response: { 200: Type.Array(${n}ResponseSchema as unknown as TSchema) },`,
    `      tags: ['${n}'],`,
    `      description: 'List ${n} records',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { limit, offset } = request.query as { limit?: number; offset?: number };`,
    `    const items = ${n}Repository.list${n}s(fastify.db, limit, offset);`,
    `    return reply.code(200).send(items);`,
    `  });`,
  ].join('\n');
}

export function buildRoutePut(n: string): string {
  return [
    `  fastify.put('/:id', {`,
    `    schema: {`,
    `      params: IdParamsSchema,`,
    `      body: Type.Partial(Create${n}Schema),`,
    `      response: { 200: ${n}ResponseSchema as unknown as TSchema, 404: NotFoundSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Update a ${n} by ID',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { id } = request.params as { id: string };`,
    `    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema`,
    `    const updated = ${n}Repository.update${n}(fastify.db, id, request.body as Record<string, unknown>);`,
    `    if (!updated) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(200).send(updated);`,
    `  });`,
  ].join('\n');
}

export function buildRouteDelete(n: string): string {
  return [
    `  fastify.delete('/:id', {`,
    `    schema: {`,
    `      params: IdParamsSchema,`,
    `      response: { 204: Type.Null(), 404: NotFoundSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Delete a ${n} by ID',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { id } = request.params as { id: string };`,
    `    const deleted = ${n}Repository.delete${n}(fastify.db, id);`,
    `    if (!deleted) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(204).send();`,
    `  });`,
  ].join('\n');
}
