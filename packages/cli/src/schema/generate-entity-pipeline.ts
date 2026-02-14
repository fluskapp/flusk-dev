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
import { registerDefaultTraits } from '../traits/register-defaults.js';
import { composeTraits } from '../traits/trait.composer.js';
import type { StorageTarget } from './entity-schema.types.js';

const logger = createLogger({ name: 'schema:pipeline' });

/** Result of a generation run */
export interface PipelineResult {
  files: Array<{ path: string; action: 'created' | 'updated' }>;
  entityName: string;
  traits: string[];
}

/**
 * Run the full entity generation pipeline from a YAML file.
 * Parses, validates, generates TypeBox + migration + types + traits.
 */
export function runEntityPipeline(
  yamlPath: string,
  projectRoot: string,
): PipelineResult {
  logger.info({ yamlPath }, 'Starting entity pipeline');
  registerDefaultTraits();

  const schema = parseEntitySchema(yamlPath);
  const errors = validateEntitySchema(schema);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
  }

  const kebab = toKebabCase(schema.name);
  const files: PipelineResult['files'] = [];
  let allTraits: string[] = [];

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

  // 4. Compose traits for each storage target
  const hasCapabilities = schema.capabilities &&
    Object.values(schema.capabilities).some(Boolean);
  if (hasCapabilities) {
    const targets: StorageTarget[] = schema.storage ?? ['sqlite'];
    for (const target of targets) {
      const composed = composeTraits(schema, target);
      allTraits = composed.traitNames;
      const dir = resolve(projectRoot,
        `packages/resources/src/${target}/repositories`);
      writeGenerated(dir, `${kebab}.repository.ts`,
        composed.repository, files);
      if (composed.migration) {
        const migDir = resolve(projectRoot,
          `packages/resources/src/${target}/sql`);
        writeGenerated(migDir, `${kebab}-traits.sql`,
          composed.migration, files);
      }
      if (composed.route) {
        const routeDir = resolve(projectRoot,
          `packages/execution/src/routes`);
        writeGenerated(routeDir, `${kebab}.routes.ts`,
          composed.route, files);
      }
    }
    logger.info({ traits: allTraits }, 'Traits composed');
  }

  logger.info({ name: schema.name, fileCount: files.length },
    'Entity pipeline complete');
  return { files, entityName: schema.name, traits: allTraits };
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
