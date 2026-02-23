/**
 * Trait composition step of the entity generation pipeline.
 *
 * WHY: Extracted from generate-entity-pipeline to keep files under 100 lines.
 */

import { resolve } from 'node:path';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { composeTraits } from '../traits/trait.composer.js';
import { buildFileHeader } from '../regeneration/file-header.js';
import { wrapGenerated, emptyCustomSection } from '../regeneration/region-markers.js';
import { writeGeneratedFile } from './pipeline-file-writer.js';
import type { EntitySchema, StorageTarget } from './entity-schema.types.js';

const logger = createLogger({ name: 'schema:pipeline' });

/** Compose and write trait-generated files for all storage targets */
export function composeAndWriteTraits(
  schema: EntitySchema,
  projectRoot: string,
  header: string,
  yamlRel: string,
  yamlContent: string,
  kebab: string,
  files: Array<{ path: string; action: 'created' | 'updated' }>,
): string[] {
  const targets: StorageTarget[] = schema.storage ?? ['sqlite'];
  let allTraits: string[] = [];

  for (const target of targets) {
    const composed = composeTraits(schema, target);
    allTraits = composed.traitNames;
    const dir = resolve(projectRoot,
      `packages/resources/src/${target}/repositories`);
    const repoBody = `${header}\n\n${wrapGenerated(composed.repository, 'repository')}\n\n${emptyCustomSection('repository')}`;
    writeGeneratedFile(dir, `${kebab}.repository.ts`, repoBody, files);
    if (composed.migration) {
      writeMigration(composed.migration, projectRoot, target, kebab,
        yamlRel, yamlContent, files);
    }
    if (composed.route) {
      const routeDir = resolve(projectRoot, `packages/execution/src/routes`);
      const routeBody = `${header}\n\n${wrapGenerated(composed.route, 'routes')}\n\n${emptyCustomSection('routes')}`;
      writeGeneratedFile(routeDir, `${kebab}.routes.ts`, routeBody, files);
    }
  }
  logger.info({ traits: allTraits }, 'Traits composed');
  return allTraits;
}

function writeMigration(
  migration: string,
  projectRoot: string,
  target: StorageTarget,
  kebab: string,
  yamlRel: string,
  yamlContent: string,
  files: Array<{ path: string; action: 'created' | 'updated' }>,
): void {
  const mainSqlPath = resolve(projectRoot,
    `packages/resources/src/${target}/sql`, `${kebab}.sql`);
  if (existsSync(mainSqlPath)) {
    const existing = readFileSync(mainSqlPath, 'utf-8');
    writeFileSync(mainSqlPath, `${existing}\n${migration}\n`);
  } else {
    const migDir = resolve(projectRoot,
      `packages/resources/src/${target}/sql`);
    const traitH = buildFileHeader(yamlRel, yamlContent, { sql: true });
    writeGeneratedFile(migDir, `${kebab}.sql`,
      `${traitH}\n\n${migration}`, files);
  }
}
