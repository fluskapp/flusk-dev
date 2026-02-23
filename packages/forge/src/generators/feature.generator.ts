/**
 * Feature generator - scaffolds a complete feature across all packages
 */

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { generateTypes } from './types.generator.js';
import { generateResources } from './resources.generator.js';
import { generateBusinessLogic } from './business-logic.generator.js';
import { generateExecution } from './execution.generator.js';
import { generateFeatureTest } from './feature-test.generator.js';
import { createEntityStub } from './entity-stub.js';
import { updateBarrels } from './feature-barrels.js';

export interface FeatureResult {
  files: { path: string; action: 'created' | 'updated' }[];
}

export interface FeatureOptions {
  skipEntity?: boolean;
  skipRoutes?: boolean;
  skipTests?: boolean;
  skipMigration?: boolean;
}

/**
 * Generate a complete feature across all packages
 */
export async function generateFeature(
  entityName: string,
  options: FeatureOptions = {},
): Promise<FeatureResult> {
  const root = process.cwd();
  const entityPath = resolve(root,
    `packages/entities/src/${entityName}.entity.ts`);
  const result: FeatureResult = { files: [] };

  if (!options.skipEntity && !existsSync(entityPath)) {
    await createEntityStub(entityName, root);
    result.files.push({
      path: `packages/entities/src/${entityName}.entity.ts`,
      action: 'created',
    });
  }

  if (!options.skipEntity) {
    await generateTypes(entityPath, entityName);
    result.files.push({
      path: `packages/types/src/${entityName}.types.ts`,
      action: 'created',
    });
  }

  const resourceResults = await generateResources(entityPath, entityName);
  const filteredResources = options.skipMigration
    ? resourceResults.filter(r => !r.path.includes('migrations'))
    : resourceResults;
  for (const r of filteredResources) {
    result.files.push({ path: r.path, action: 'created' });
  }

  const logicResults = await generateBusinessLogic(entityPath, entityName);
  for (const r of logicResults) {
    result.files.push({ path: r.path, action: 'created' });
  }

  if (!options.skipRoutes) {
    const execResults = await generateExecution(entityPath, entityName);
    for (const r of execResults) {
      result.files.push({ path: r.path, action: 'created' });
    }
  }

  if (!options.skipTests) {
    const testResult = await generateFeatureTest(entityName, root);
    result.files.push({ path: testResult.path, action: 'created' });
  }

  await updateBarrels(entityName, root, options, result);
  return result;
}
