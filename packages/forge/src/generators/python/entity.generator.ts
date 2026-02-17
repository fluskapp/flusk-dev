/**
 * Python entity generator — YAML → Pydantic v2 model.
 *
 * WHY: Generates Python entity files from the same YAML schemas
 * used for TypeScript, enabling a parallel Python package.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { EntitySchema } from '../../schema/entity-schema.types.js';
import { renderEntityTemplate } from '../../templates/python/entity.template.js';
import { toSnakeCase, toKebabCase } from '../utils.js';

const ENTITY_DIR = 'flusk-py/src/flusk/entities';

/** Generate a Python entity file from an EntitySchema */
export async function generatePythonEntity(
  schema: EntitySchema,
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const snakeName = toSnakeCase(toKebabCase(schema.name).replace(/-/g, '_'));
  const fileName = `${snakeName}.py`;
  const outDir = resolve(projectRoot, ENTITY_DIR);

  await mkdir(outDir, { recursive: true });
  const content = renderEntityTemplate(schema);
  await writeFile(resolve(outDir, fileName), content, 'utf-8');

  return { path: `${ENTITY_DIR}/${fileName}`, content };
}
