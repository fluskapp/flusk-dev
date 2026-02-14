/**
 * Entity generation pipeline — YAML → parse → validate → generate.
 *
 * WHY: This orchestrates the full code generation from a single
 * YAML file. It's the core of `flusk generate entity --from <yaml>`.
 * Each step is logged for debuggability.
 */

import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { parseEntitySchema } from './entity-schema.parser.js';
import { validateEntitySchema } from './entity-schema.validator.js';
import { generateTypeBoxContent } from './generate-typebox.js';
import { generateMigrationSql } from './generate-migration.js';
import { generateTypesFileContent } from './generate-types-file.js';
import { toKebabCase } from '../generators/utils.js';

const logger = createLogger({ name: 'schema:pipeline' });

/** Result of a generation run */
export interface PipelineResult {
  files: Array<{ path: string; action: 'created' | 'updated' }>;
  entityName: string;
}

/**
 * Run the full entity generation pipeline from a YAML file.
 * Parses, validates, generates TypeBox + migration + types.
 */
export function runEntityPipeline(
  yamlPath: string,
  projectRoot: string,
): PipelineResult {
  logger.info({ yamlPath }, 'Starting entity pipeline');

  const schema = parseEntitySchema(yamlPath);
  const errors = validateEntitySchema(schema);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
  }

  const kebab = toKebabCase(schema.name);
  const files: PipelineResult['files'] = [];

  // 1. Generate TypeBox entity
  const entityDir = resolve(projectRoot, 'packages/entities/src');
  writeGenerated(entityDir, `${kebab}.entity.ts`,
    generateTypeBoxContent(schema), files);

  // 2. Generate types file
  const typesDir = resolve(projectRoot, 'packages/types/src');
  writeGenerated(typesDir, `${kebab}.types.ts`,
    generateTypesFileContent(schema), files);

  // 3. Generate migration SQL
  const sqlDir = resolve(projectRoot, 'packages/resources/src/sqlite/sql');
  const migName = `${kebab}.sql`;
  writeGenerated(sqlDir, migName, generateMigrationSql(schema), files);

  logger.info({ name: schema.name, fileCount: files.length },
    'Entity pipeline complete');
  return { files, entityName: schema.name };
}

/** Write a file and track it in the results */
function writeGenerated(
  dir: string,
  filename: string,
  content: string,
  files: PipelineResult['files'],
): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fullPath = resolve(dir, filename);
  const action = existsSync(fullPath) ? 'updated' : 'created';
  writeFileSync(fullPath, content, 'utf-8');
  files.push({ path: fullPath, action });
  logger.debug({ file: filename, action }, 'File written');
}
