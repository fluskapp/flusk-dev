/**
 * Python repository generator — YAML → sqlite3 repository.
 *
 * WHY: Generates Python sqlite3 repositories from entity YAML,
 * using the same parameterized-query philosophy as Node.js.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { EntitySchema } from '../../schema/entity-schema.types.js';
import { renderRepositoryTemplate } from '../../templates/python/repository.template.js';
import { toSnakeCase, toKebabCase } from '../utils.js';

const REPO_DIR = 'flusk-py/src/flusk/storage/sqlite/repositories';

/** Generate Python repository file from an EntitySchema */
export async function generatePythonRepository(
  schema: EntitySchema,
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const snakeName = toSnakeCase(toKebabCase(schema.name).replace(/-/g, '_'));
  const fileName = `${snakeName}_repo.py`;
  const outDir = resolve(projectRoot, REPO_DIR);

  await mkdir(outDir, { recursive: true });
  const content = renderRepositoryTemplate(schema);
  await writeFile(resolve(outDir, fileName), content, 'utf-8');

  return { path: `${REPO_DIR}/${fileName}`, content };
}
