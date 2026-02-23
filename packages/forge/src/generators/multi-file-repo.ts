/**
 * Multi-file repository generator — generates one file per function.
 *
 * WHY: The existing hand-written repos use one-file-per-function in
 * a directory. This generator matches that structure so generated
 * code can drop-in replace hand-written code.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { generateRowToEntity, generateCreate, generateFindById, generateList, generateUpdate } from './multi-file-crud.js';
import { generateCustomQuery } from './multi-file-queries.js';
import { normalizeQueries } from './multi-file-repo-helpers.js';
import { generateBarrel } from './multi-file-repo-barrel.js';

// Re-export for backward compatibility
export type { GeneratedFile } from './multi-file-repo-helpers.js';
export { toKebab, normalizeQueries } from './multi-file-repo-helpers.js';

/**
 * Generate all repository files for an entity.
 */
export function generateMultiFileRepo(
  schema: EntitySchema,
  options?: { includeUpdate?: boolean },
): { filename: string; content: string }[] {
  const files: { filename: string; content: string }[] = [];
  const hasUpdate = options?.includeUpdate ?? false;

  files.push({ filename: 'row-to-entity.ts', content: generateRowToEntity(schema) });
  files.push({ filename: 'create.ts', content: generateCreate(schema) });
  files.push({ filename: 'find-by-id.ts', content: generateFindById(schema) });
  files.push({ filename: 'list.ts', content: generateList(schema) });
  if (hasUpdate) {
    files.push({ filename: 'update.ts', content: generateUpdate(schema) });
  }

  const queries = normalizeQueries(schema.queries);
  for (const q of queries) {
    files.push(generateCustomQuery(schema, q));
  }

  files.push({ filename: 'index.ts', content: generateBarrel(schema, hasUpdate) });
  return files;
}
