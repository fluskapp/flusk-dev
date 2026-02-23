/**
 * Entity generation pipeline — YAML → parse → validate → generate.
 *
 * WHY: This orchestrates the full code generation from a single
 * YAML file. It's the core of `flusk generate entity --from <yaml>`.
 */

import { resolve, relative } from 'node:path';
import { readFileSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { parseEntitySchema } from './entity-schema.parser.js';
import { validateEntitySchema } from './entity-schema.validator.js';
import { generateTypeBoxContent } from './generate-typebox.js';
import { generateMigrationSql } from './generate-migration.js';
import { generateTypesFileContent } from './generate-types-file.js';
import { toKebabCase } from '../generators/utils.js';
import { registerDefaultTraits } from '../traits/register-defaults.js';
import { buildFileHeader } from '../regeneration/file-header.js';
import { wrapGenerated, emptyCustomSection } from '../regeneration/region-markers.js';
import { writeGeneratedFile } from './pipeline-file-writer.js';
import { composeAndWriteTraits } from './pipeline-traits.js';

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

  // 3. Generate migration SQL
  const sqlDir = resolve(projectRoot, 'packages/resources/src/sqlite/sql');
  const sqlHeader = buildFileHeader(yamlRel, yamlContent, { sql: true });
  writeGeneratedFile(sqlDir, `${kebab}.sql`,
    `${sqlHeader}\n\n${generateMigrationSql(schema)}`, files);

  // 4. Compose traits
  const hasCapabilities = schema.capabilities &&
    Object.values(schema.capabilities).some(Boolean);
  if (hasCapabilities) {
    allTraits = composeAndWriteTraits(
      schema, projectRoot, header, yamlRel, yamlContent, kebab, files);
  }

  logger.info({ name: schema.name, fileCount: files.length },
    'Entity pipeline complete');
  return { files, entityName: schema.name, traits: allTraits };
}
