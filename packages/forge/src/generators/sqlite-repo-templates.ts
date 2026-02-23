/**
 * SQLite repository file templates — rowToEntity, create, findById, list, index.
 */

import { createTpl, findByIdTpl, listTpl } from './sqlite-repo-crud.js';

export interface FileEntry {
  filename: string;
  content: string;
}

export function buildFiles(
  name: string,
  pascal: string,
  table: string,
): FileEntry[] {
  return [
    { filename: 'row-to-entity.ts', content: rowToEntityTpl(pascal) },
    { filename: 'create.ts', content: createTpl(pascal, table) },
    { filename: 'find-by-id.ts', content: findByIdTpl(pascal, table) },
    { filename: 'list.ts', content: listTpl(pascal, table) },
    { filename: 'index.ts', content: indexTpl(name) },
  ];
}

function rowToEntityTpl(pascal: string): string {
  return `import type { ${pascal}Entity } from '@flusk/entities';

/**
 * Convert SQLite row to ${pascal}Entity
 */
export function rowToEntity(row: Record<string, unknown>): ${pascal}Entity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as ${pascal}Entity;
}
`;
}

function indexTpl(name: string): string {
  return `/**
 * SQLite ${name} repository barrel
 */

export { create } from './create.js';
export { findById } from './find-by-id.js';
export { list } from './list.js';
`;
}
