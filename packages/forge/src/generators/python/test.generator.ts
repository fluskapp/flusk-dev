/**
 * Python test generator — YAML → pytest test file.
 *
 * WHY: Generates test scaffolding for each entity so the
 * Python package has test coverage from day one.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { EntitySchema } from '../../schema/entity-schema.types.js';
import { renderTestTemplate } from '../../templates/python/test.template.js';
import { toSnakeCase, toKebabCase } from '../utils.js';

const TEST_DIR = 'flusk-py/tests';

/** Generate Python test file from an EntitySchema */
export async function generatePythonTest(
  schema: EntitySchema,
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const snakeName = toSnakeCase(toKebabCase(schema.name).replace(/-/g, '_'));
  const fileName = `test_${snakeName}.py`;
  const outDir = resolve(projectRoot, TEST_DIR);

  await mkdir(outDir, { recursive: true });
  const content = renderTestTemplate(schema);
  await writeFile(resolve(outDir, fileName), content, 'utf-8');

  return { path: `${TEST_DIR}/${fileName}`, content };
}
