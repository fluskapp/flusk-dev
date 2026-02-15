/**
 * CRUD trait — generates create, findById, list, update, delete.
 *
 * WHY: CRUD is the most common capability. This trait generates
 * the full repository + route boilerplate so entities get a
 * working API from just a YAML definition.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection } from './section-helpers.js';
import {
  buildRowToEntity,
  buildHelpers,
  buildCreate,
  buildFindById,
  buildList,
  buildUpdate,
  buildDelete,
  buildCrudRoutes,
} from './crud-builders.js';

/** Create the CRUD trait instance */
export function createCrudTrait(): Trait {
  return {
    name: 'crud',
    description: 'Full CRUD operations: create, findById, list, update, delete',
    dependencies: [],
    generate: (ctx: TraitContext): TraitOutput => generateCrud(ctx),
  };
}

/** Generate CRUD code sections for the given context */
function generateCrud(ctx: TraitContext): TraitOutput {
  const { schema, storageTarget: st, tableName } = ctx;
  const n = schema.name;
  const fields = Object.entries(schema.fields);

  return {
    traitName: 'crud',
    repository: {
      imports: [
        `import type { ${n}Entity } from '@flusk/entities';`,
        `import type { DatabaseSync } from 'node:sqlite';`,
      ],
      types: [
        `export type Create${n}Input = Omit<${n}Entity, 'id' | 'createdAt' | 'updatedAt'>;`,
        `export type Update${n}Input = Partial<Create${n}Input>;`,
      ],
      functions: [
        buildRowToEntity(n, fields),
        buildHelpers(fields),
        buildCreate(n, tableName, fields, st),
        buildFindById(n, tableName, st),
        buildList(n, tableName, st),
        buildUpdate(n, tableName),
        buildDelete(n, tableName, st),
      ],
      sql: [],
      routes: [],
    },
    route: buildCrudRoutes(n),
    migration: emptySection(),
  };
}
