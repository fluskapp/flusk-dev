/**
 * Entity generation pipeline — YAML → parse → validate → generate.
 *
 * WHY: This orchestrates the full code generation from a single
 * YAML file. It's the core of `flusk generate entity --from <yaml>`.
 * Each step is logged for debuggability.
 */

import { resolve, relative } from 'node:path';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { parseEntitySchema } from './entity-schema.parser.js';
import { validateEntitySchema } from './entity-schema.validator.js';
import { generateTypeBoxContent } from './generate-typebox.js';
import { generateMigrationSql } from './generate-migration.js';
import { generateTypesFileContent } from './generate-types-file.js';
import { toKebabCase } from '../generators/utils.js';
import { registerDefaultTraits } from '../traits/register-defaults.js';
import { composeTraits } from '../traits/trait.composer.js';
import { buildFileHeader } from '../regeneration/file-header.js';
import { wrapGenerated, emptyCustomSection } from '../regeneration/region-markers.js';
import { smartMerge } from '../regeneration/smart-merge.js';
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
  const yamlContent = readFileSync(yamlPath, 'utf-8');
  const yamlRel = relative(projectRoot, yamlPath);
  const header = buildFileHeader(yamlRel, yamlContent);
  const files: PipelineResult['files'] = [];
  let allTraits: string[] = [];

  // 1. Generate TypeBox entity
  const entityDir = resolve(projectRoot, 'packages/entities/src');
  const entityBody = wrapGenerated(generateTypeBoxContent(schema), 'typebox');
  writeGeneratedFile(entityDir, `${kebab}.entity.ts`,
    `${header}\n\n${entityBody}\n\n${emptyCustomSection('entity')}`, files);

  // 2. Generate types file
  const typesDir = resolve(projectRoot, 'packages/types/src');
  const typesBody = wrapGenerated(generateTypesFileContent(schema), 'types');
  writeGeneratedFile(typesDir, `${kebab}.types.ts`,
    `${header}\n\n${typesBody}`, files);

  // 3. Generate migration SQL (uses -- comments for SQLite compat)
  const sqlDir = resolve(projectRoot, 'packages/resources/src/sqlite/sql');
  const sqlHeader = buildFileHeader(yamlRel, yamlContent, { sql: true });
  writeGeneratedFile(sqlDir, `${kebab}.sql`,
    `${sqlHeader}\n\n${generateMigrationSql(schema)}`, files);

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
      const repoBody = `${header}\n\n${wrapGenerated(composed.repository, 'repository')}\n\n${emptyCustomSection('repository')}`;
      writeGeneratedFile(dir, `${kebab}.repository.ts`, repoBody, files);
      if (composed.migration) {
        // Append trait SQL to main file (avoid sort-order issues)
        const mainSqlPath = resolve(projectRoot,
          `packages/resources/src/${target}/sql`, `${kebab}.sql`);
        if (existsSync(mainSqlPath)) {
          const existing = readFileSync(mainSqlPath, 'utf-8');
          writeFileSync(mainSqlPath,
            `${existing}\n${composed.migration}\n`);
        } else {
          const migDir = resolve(projectRoot,
            `packages/resources/src/${target}/sql`);
          const traitH = buildFileHeader(yamlRel, yamlContent, { sql: true });
          writeGeneratedFile(migDir, `${kebab}.sql`,
            `${traitH}\n\n${composed.migration}`, files);
        }
      }
      if (composed.route) {
        const routeDir = resolve(projectRoot,
          `packages/execution/src/routes`);
        const routeBody = `${header}\n\n${wrapGenerated(composed.route, 'routes')}\n\n${emptyCustomSection('routes')}`;
        writeGeneratedFile(routeDir, `${kebab}.routes.ts`, routeBody, files);
      }
    }
    logger.info({ traits: allTraits }, 'Traits composed');
  }

  logger.info({ name: schema.name, fileCount: files.length },
    'Entity pipeline complete');
  return { files, entityName: schema.name, traits: allTraits };
}

/** Write a file with smart-merge if it already exists */
function writeGeneratedFile(
  dir: string,
  filename: string,
  content: string,
  files: PipelineResult['files'],
): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fullPath = resolve(dir, filename);
  const action = existsSync(fullPath) ? 'updated' : 'created';
  if (action === 'updated') {
    const existing = readFileSync(fullPath, 'utf-8');
    const merged = smartMerge(content, existing);
    writeFileSync(fullPath, merged.content, 'utf-8');
    logger.debug({ file: filename, preserved: merged.customSectionsPreserved }, 'Merged');
  } else {
    writeFileSync(fullPath, content, 'utf-8');
  }
  files.push({ path: fullPath, action });
  logger.debug({ file: filename, action }, 'File written');
}
