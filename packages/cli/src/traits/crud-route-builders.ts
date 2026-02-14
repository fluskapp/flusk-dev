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
      `import { Type } from '@sinclair/typebox';`,
      `import { ${n}EntitySchema } from '@flusk/entities';`,
      `import { ${n}Repository } from '@flusk/resources';`,
    ],
    types: [
      `const Create${n}Schema = Type.Omit(${n}EntitySchema, ['id', 'createdAt', 'updatedAt']);`,
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
    `      response: { 201: ${n}ResponseSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Create a new ${n} record',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const created = await ${n}Repository.create(request.body);`,
    `    return reply.code(201).send(created);`,
    `  });`,
  ].join('\n');
}

function buildRouteGetById(n: string): string {
  return [
    `  fastify.get('/:id', {`,
    `    schema: {`,
    `      params: IdParamsSchema,`,
    `      response: { 200: ${n}ResponseSchema, 404: NotFoundSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Get a ${n} by ID',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { id } = request.params as { id: string };`,
    `    const entity = await ${n}Repository.findById(id);`,
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
    `      response: { 200: Type.Array(${n}ResponseSchema) },`,
    `      tags: ['${n}'],`,
    `      description: 'List ${n} records',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { limit, offset } = request.query as { limit?: number; offset?: number };`,
    `    const items = await ${n}Repository.list(limit, offset);`,
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
    `      response: { 200: ${n}ResponseSchema, 404: NotFoundSchema },`,
    `      tags: ['${n}'],`,
    `      description: 'Update a ${n} by ID',`,
    `    },`,
    `  }, async (request, reply) => {`,
    `    const { id } = request.params as { id: string };`,
    `    const updated = await ${n}Repository.update(id, request.body);`,
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
    `    const deleted = await ${n}Repository.delete(id);`,
    `    if (!deleted) return reply.code(404).send({ error: 'Not found' });`,
    `    return reply.code(204).send();`,
    `  });`,
  ].join('\n');
}
