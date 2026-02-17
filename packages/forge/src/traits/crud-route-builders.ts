/**
 * Route builder functions for CRUD trait code generation.
 *
 * WHY: Extracted from crud-builders.ts to keep files under 150 lines.
 * Generates production-quality Fastify routes with TypeBox schemas.
 */

import type { TraitCodeSection } from './trait.types.js';

/** Build CRUD route section with TypeBox schemas and proper status codes */
export function buildCrudRoutes(n: string): TraitCodeSection {
  return {
    imports: [
      `import type { FastifyInstance } from 'fastify';`,
      `import { Type, type TSchema } from '@sinclair/typebox';`,
      `import { ${n}EntitySchema } from '@flusk/entities';`,
      `import { ${n}Repository } from '@flusk/resources';`,
    ],
    types: [
      `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast`,
      `const Create${n}Schema = Type.Omit(${n}EntitySchema as any, ['id', 'createdAt', 'updatedAt']);`,
      `const ${n}ResponseSchema = ${n}EntitySchema;`,
      `const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });`,
      `const NotFoundSchema = Type.Object({ error: Type.String() });`,
      `const ListQuerySchema = Type.Object({`,
      `  limit: Type.Optional(Type.Integer({ minimum: 1 })),`,
      `  offset: Type.Optional(Type.Integer({ minimum: 0 })),`,
      `});`,
    ],
    functions: [
      buildRoutePost(n),
      buildRouteGetById(n),
      buildRouteList(n),
      buildRoutePut(n),
      buildRouteDelete(n),
    ],
    sql: [],
    routes: [],
  };
}

function buildRoutePost(n: string): string {
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
    `    const created = ${n}Repository.create(fastify.db, request.body as any);`,
    `    return reply.code(201).send(created);`,
    `  });`,
  ].join('\n');
}

function buildRouteGetById(n: string): string {
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
    `    const entity = ${n}Repository.findById(fastify.db, id);`,
    `    if (!entity) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(200).send(entity);`,
    `  });`,
  ].join('\n');
}

function buildRouteList(n: string): string {
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
    `    const items = ${n}Repository.list(fastify.db, limit, offset);`,
    `    return reply.code(200).send(items);`,
    `  });`,
  ].join('\n');
}

function buildRoutePut(n: string): string {
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
    `    const updated = ${n}Repository.update(fastify.db, id, request.body as any);`,
    `    if (!updated) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(200).send(updated);`,
    `  });`,
  ].join('\n');
}

function buildRouteDelete(n: string): string {
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
    `    const deleted = ${n}Repository.deleteById(fastify.db, id);`,
    `    if (!deleted) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(204).send();`,
    `  });`,
  ].join('\n');
}
