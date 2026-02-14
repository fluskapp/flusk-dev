/**
 * SQLite repository generator — produces repository files
 * that use node:sqlite DatabaseSync instead of pg Pool.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { toPascalCase, toTableName } from './utils.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

export interface SqliteRepoOptions {
  name: string;
  extraMethods?: string[];
}

export async function generateSqliteRepo(
  options: SqliteRepoOptions,
): Promise<GeneratorResult[]> {
  const { name } = options;
  const results: GeneratorResult[] = [];
  const baseDir = resolve(
    process.cwd(),
    'packages/resources/src/sqlite/repositories',
    name,
  );

  if (!existsSync(baseDir)) {
    await mkdir(baseDir, { recursive: true });
  }

  const pascal = toPascalCase(name);
  const table = toTableName(name);
  const files = buildFiles(name, pascal, table);

  for (const file of files) {
    const filePath = resolve(baseDir, file.filename);
    await writeFile(filePath, file.content, 'utf-8');
    results.push({
      path: `resources/sqlite/repositories/${name}/${file.filename}`,
      content: file.content,
    });
  }

  return results;
}

interface FileEntry {
  filename: string;
  content: string;
}

function buildFiles(
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

function createTpl(pascal: string, table: string): string {
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${pascal}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new ${pascal} record
 */
export function create(
  db: DatabaseSync,
  data: Omit<${pascal}Entity, 'id' | 'createdAt' | 'updatedAt'>,
): ${pascal}Entity {
  // TODO: implement INSERT for ${table}
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
`;
}

function findByIdTpl(pascal: string, table: string): string {
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${pascal}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find ${pascal} by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): ${pascal}Entity | null {
  const stmt = db.prepare('SELECT * FROM ${table} WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
`;
}

function listTpl(pascal: string, table: string): string {
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${pascal}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List ${pascal} records with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): ${pascal}Entity[] {
  const stmt = db.prepare(
    'SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
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
