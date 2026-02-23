/**
 * SQLite repository generator — produces repository files
 * that use node:sqlite DatabaseSync instead of pg Pool.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { toPascalCase, toTableName } from './utils.js';
import { buildFiles } from './sqlite-repo-templates.js';

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
