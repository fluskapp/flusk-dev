/** @generated —
 * CRUD trait — generates create, findById, list, update, delete.
 *
 * WHY: CRUD is the most common capability. This trait generates
 * the full repository + route boilerplate so entities get a
 * working API from just a YAML definition.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection } from './section-helpers.js';
import { placeholder } from './sql-helpers.js';

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
  const { schema, storageTarget: st, tableName, camelName } = ctx;
  const n = schema.name;
  const p = (i: number) => placeholder(st, i);
  const fields = Object.keys(schema.fields);
  const snakeFields = fields.map(toSnake);
  const insertCols = snakeFields.join(', ');
  const insertPlaceholders = fields.map((_, i) => p(i + 1)).join(', ');

  return {
    traitName: 'crud',
    repository: {
      imports: [
        `import type { ${n}Entity } from '@flusk/types';`,
        `import type { DatabaseSync } from 'node:sqlite';`,
      ],
      types: [
        `export type Create${n}Input = Omit<${n}Entity, 'id' | 'createdAt' | 'updatedAt'>;`,
        `export type Update${n}Input = Partial<Create${n}Input>;`,
      ],
      functions: [
        buildCreate(n, tableName, insertCols, insertPlaceholders, fields),
        buildFindById(n, tableName, p),
        buildList(n, tableName, st),
        buildUpdate(n, tableName),
        buildDelete(n, tableName, p),
      ],
      sql: [],
      routes: [],
    },
    route: buildCrudRoutes(n, camelName),
    migration: emptySection(),
  };
}

function buildCreate(n: string, t: string, cols: string, ph: string, fields: string[]): string {
  return `/** Create a new ${n} record */
export function create${n}(db: DatabaseSync, data: Create${n}Input): ${n}Entity {
  const stmt = db.prepare(\`INSERT INTO ${t} (${cols}) VALUES (${ph}) RETURNING *\`);
  return stmt.get(${fields.map((f) => `data.${f}`).join(', ')}) as ${n}Entity;
}`;
}

function buildFindById(n: string, t: string, p: (i: number) => string): string {
  return `/** Find ${n} by ID, returns null if not found */
export function find${n}ById(db: DatabaseSync, id: string): ${n}Entity | null {
  const stmt = db.prepare(\`SELECT * FROM ${t} WHERE id = ${p(1)}\`);
  return (stmt.get(id) as ${n}Entity) ?? null;
}`;
}

function buildList(n: string, t: string, st: import('../schema/index.js').StorageTarget): string {
  const p1 = placeholder(st, 1);
  const p2 = placeholder(st, 2);
  return `/** List ${n} records with pagination */
export function list${n}s(db: DatabaseSync, limit = 50, offset = 0): ${n}Entity[] {
  const stmt = db.prepare(\`SELECT * FROM ${t} ORDER BY created_at DESC LIMIT ${p1} OFFSET ${p2}\`);
  return stmt.all(limit, offset) as ${n}Entity[];
}`;
}

function buildUpdate(n: string, t: string): string {
  return `/** Update a ${n} record by ID */
export function update${n}(db: DatabaseSync, id: string, data: Update${n}Input): ${n}Entity | null {
  const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
  if (keys.length === 0) return find${n}ById(db, id);
  const sets = keys.map((k, i) => \`\${toSnake(k)} = ?\`).join(', ');
  const vals = keys.map((k) => data[k as keyof typeof data]);
  const stmt = db.prepare(\`UPDATE ${t} SET \${sets} WHERE id = ? RETURNING *\`);
  return (stmt.get(...vals, id) as ${n}Entity) ?? null;
}`;
}

function buildDelete(n: string, t: string, p: (i: number) => string): string {
  return `/** Delete a ${n} record by ID */
export function delete${n}(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare(\`DELETE FROM ${t} WHERE id = ${p(1)}\`);
  const result = stmt.run(id);
  return result.changes > 0;
}`;
}

function buildCrudRoutes(n: string, camel: string): import('./trait.types.js').TraitCodeSection {
  return {
    imports: [`import { ${n}EntitySchema } from '@flusk/types';`],
    types: [],
    functions: [
      `/** Register CRUD routes for ${n} */`,
      `export function register${n}CrudRoutes(app: FastifyInstance): void {`,
      `  app.get('/${camel}s', async (req) => list${n}s(req.db));`,
      `  app.get('/${camel}s/:id', async (req) => find${n}ById(req.db, req.params.id));`,
      `  app.post('/${camel}s', async (req) => create${n}(req.db, req.body));`,
      `  app.put('/${camel}s/:id', async (req) => update${n}(req.db, req.params.id, req.body));`,
      `  app.delete('/${camel}s/:id', async (req) => delete${n}(req.db, req.params.id));`,
      `}`,
    ],
    sql: [],
    routes: [],
  };
}

/** Convert camelCase to snake_case */
function toSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}
