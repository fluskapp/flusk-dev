/**
 * Python types generator — YAML → Insert/Update/Query TypedDicts.
 *
 * WHY: Generates typed operation dicts for each entity,
 * keeping type safety across the Python package.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { EntitySchema } from '../../schema/entity-schema.types.js';
import { renderTypesTemplate } from '../../templates/python/types.template.js';
import { toSnakeCase, toKebabCase } from '../utils.js';

const TYPES_DIR = 'flusk-py/src/flusk/types';

/** Generate Python types file from an EntitySchema */
export async function generatePythonTypes(
  schema: EntitySchema,
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const snakeName = toSnakeCase(toKebabCase(schema.name).replace(/-/g, '_'));
  const fileName = `${snakeName}_types.py`;
  const outDir = resolve(projectRoot, TYPES_DIR);

  await mkdir(outDir, { recursive: true });
  const content = renderTypesTemplate(schema);
  await writeFile(resolve(outDir, fileName), content, 'utf-8');

  return { path: `${TYPES_DIR}/${fileName}`, content };
}
