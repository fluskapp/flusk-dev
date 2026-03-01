/**
 * Route builder functions for CRUD trait code generation.
 *
 * WHY: Extracted from crud-builders.ts to keep files under 150 lines.
 * Generates production-quality Fastify routes with TypeBox schemas.
 */

import type { TraitCodeSection } from './trait.types.js';
import {
  buildRoutePost,
  buildRouteGetById,
  buildRouteList,
  buildRoutePut,
  buildRouteDelete,
} from './crud-route-individual.js';

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
      `const Create${n}Schema = Type.Omit(${n}EntitySchema as unknown as import('@sinclair/typebox').TObject, ['id', 'createdAt', 'updatedAt']);`,
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
