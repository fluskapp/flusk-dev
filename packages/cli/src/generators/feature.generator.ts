/**
 * Feature generator - scaffolds a complete feature across all packages
 * Creates: entity + types + business-logic + repository + migration + routes + plugin + hooks + tests
 */

import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { toPascalCase } from './utils.js';
import { generateTypes } from './types.generator.js';
import { generateResources } from './resources.generator.js';
import { generateBusinessLogic } from './business-logic.generator.js';
import { generateExecution } from './execution.generator.js';
import {
  updateEntitiesBarrel,
  updateTypesBarrel,
  updateResourcesBarrel,
  updateBusinessLogicBarrel,
  updateAppRegistration,
} from './barrel-updater.js';
import { generateFeatureTest } from './feature-test.generator.js';

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
  options: FeatureOptions = {}
): Promise<FeatureResult> {
  const root = process.cwd();
  const entityPath = resolve(root, `packages/entities/src/${entityName}.entity.ts`);
  const result: FeatureResult = { files: [] };

  // 1. Create entity schema if it doesn't exist
  if (!options.skipEntity && !existsSync(entityPath)) {
    await createEntityStub(entityName, root);
    result.files.push({ path: `packages/entities/src/${entityName}.entity.ts`, action: 'created' });
  }

  // 2. Generate types
  if (!options.skipEntity) {
    await generateTypes(entityPath, entityName);
    result.files.push({ path: `packages/types/src/${entityName}.types.ts`, action: 'created' });
  }

  // 3. Generate resources (repo + migration)
  const resourceResults = await generateResources(entityPath, entityName);
  const filteredResources = options.skipMigration
    ? resourceResults.filter(r => !r.path.includes('migrations'))
    : resourceResults;
  for (const r of filteredResources) {
    result.files.push({ path: r.path, action: 'created' });
  }

  // 4. Generate business logic
  const logicResults = await generateBusinessLogic(entityPath, entityName);
  for (const r of logicResults) {
    result.files.push({ path: r.path, action: 'created' });
  }

  // 5. Generate execution layer
  if (!options.skipRoutes) {
    const execResults = await generateExecution(entityPath, entityName);
    for (const r of execResults) {
      result.files.push({ path: r.path, action: 'created' });
    }
  }

  // 6. Generate test file
  if (!options.skipTests) {
    const testResult = await generateFeatureTest(entityName, root);
    result.files.push({ path: testResult.path, action: 'created' });
  }

  // 7. Update barrel exports
  if (!options.skipEntity) {
    await updateEntitiesBarrel(entityName, root);
    result.files.push({ path: 'packages/entities/src/index.ts', action: 'updated' });
    await updateTypesBarrel(entityName, root);
    result.files.push({ path: 'packages/types/src/index.ts', action: 'updated' });
  }

  await updateResourcesBarrel(entityName, root);
  result.files.push({ path: 'packages/resources/src/index.ts', action: 'updated' });

  await updateBusinessLogicBarrel(entityName, root);
  result.files.push({ path: 'packages/business-logic/src/index.ts', action: 'updated' });

  // 8. Register routes in app.ts
  if (!options.skipRoutes) {
    await updateAppRegistration(entityName, root);
    result.files.push({ path: 'packages/execution/src/app.ts', action: 'updated' });
  }

  return result;
}

/**
 * Create a minimal entity schema stub
 */
async function createEntityStub(
  entityName: string,
  root: string
): Promise<void> {
  const pascalName = toPascalCase(entityName);
  const outputPath = resolve(root, `packages/entities/src/${entityName}.entity.ts`);

  const content = `import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * ${pascalName} entity schema
 * TODO: Add your fields to the Type.Object below
 */
export const ${pascalName}EntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization ID' }),
    name: Type.String({ description: '${pascalName} name' }),
    status: Type.String({ description: '${pascalName} status' }),
  })
]);

export type ${pascalName}Entity = Static<typeof ${pascalName}EntitySchema>;
`;

  await writeFile(outputPath, content, 'utf-8');
}
