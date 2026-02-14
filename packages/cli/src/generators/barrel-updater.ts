/** @generated —
 * Barrel export updater - appends exports to index.ts files
 * Idempotent: skips if export already exists
 */

import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { toPascalCase, toCamelCase } from './utils.js';

/**
 * Append a line to a file if it doesn't already contain it
 */
async function appendIfMissing(
  filePath: string,
  marker: string,
  content: string
): Promise<boolean> {
  const existing = await readFile(filePath, 'utf-8');
  if (existing.includes(marker)) return false;
  await writeFile(filePath, existing.trimEnd() + '\n\n' + content + '\n', 'utf-8');
  return true;
}

/**
 * Update packages/entities/src/index.ts
 */
export async function updateEntitiesBarrel(
  entityName: string,
  root: string
): Promise<void> {
  const pascalName = toPascalCase(entityName);
  const filePath = resolve(root, 'packages/entities/src/index.ts');
  const marker = `${entityName}.entity.js`;

  const exportLine = [
    `// ${pascalName} entity exports`,
    `export {`,
    `  ${pascalName}EntitySchema,`,
    `  type ${pascalName}Entity`,
    `} from './${entityName}.entity.js';`,
  ].join('\n');

  await appendIfMissing(filePath, marker, exportLine);
}

/**
 * Update packages/types/src/index.ts
 */
export async function updateTypesBarrel(
  entityName: string,
  root: string
): Promise<void> {
  const pascalName = toPascalCase(entityName);
  const filePath = resolve(root, 'packages/types/src/index.ts');
  const marker = `${entityName}.types.js`;

  const exportLine = [
    `export {`,
    `  type ${pascalName}Entity as ${pascalName}EntityType,`,
    `  type ${pascalName}Insert,`,
    `  type ${pascalName}Update,`,
    `  type ${pascalName}Query,`,
    `  ${pascalName}EntityJSONSchema,`,
    `  ${pascalName}InsertSchema,`,
    `  ${pascalName}UpdateSchema,`,
    `  ${pascalName}QuerySchema`,
    `} from './${entityName}.types.js';`,
  ].join('\n');

  await appendIfMissing(filePath, marker, exportLine);
}

/**
 * Update packages/resources/src/index.ts
 */
export async function updateResourcesBarrel(
  entityName: string,
  root: string
): Promise<void> {
  const pascalName = toPascalCase(entityName);
  const filePath = resolve(root, 'packages/resources/src/index.ts');
  const marker = `${entityName}.repository.js`;

  const exportLine =
    `export * as ${pascalName}Repository from './repositories/${entityName}.repository.js';`;

  await appendIfMissing(filePath, marker, exportLine);
}

/**
 * Update packages/business-logic/src/index.ts
 */
export async function updateBusinessLogicBarrel(
  entityName: string,
  root: string
): Promise<void> {
  const camelName = toCamelCase(entityName);
  const filePath = resolve(root, 'packages/business-logic/src/index.ts');
  const marker = `./${entityName}/index.js`;

  const exportLine = `import * as ${camelName} from './${entityName}/index.js';\nexport { ${camelName} };`;

  await appendIfMissing(filePath, marker, exportLine);
}

/**
 * Register new feature routes in app.ts
 */
export async function updateAppRegistration(
  entityName: string,
  root: string
): Promise<void> {
  const filePath = resolve(root, 'packages/execution/src/app.ts');
  const existing = await readFile(filePath, 'utf-8');
  const routeFnName = `${entityName.replace(/-/g, '')}Routes`;

  if (existing.includes(routeFnName)) return;

  // Add import
  const importLine = `import { ${routeFnName} } from './routes/${entityName}.routes.js';`;
  const lastImportIdx = existing.lastIndexOf('import ');
  const lineEnd = existing.indexOf('\n', lastImportIdx);
  let updated = existing.slice(0, lineEnd + 1) + importLine + '\n' + existing.slice(lineEnd + 1);

  // Add route registration inside the api register block
  const registerMarker = `{ prefix: '/api/v1' }`;
  const markerIdx = updated.indexOf(registerMarker);
  if (markerIdx === -1) return;

  // Find the closing of the async function before the prefix
  const closingBrace = updated.lastIndexOf('},', markerIdx);
  const insertPoint = updated.lastIndexOf('\n', closingBrace);

  const routeLine = `      await api.register(${routeFnName}, { prefix: '/${entityName}s' });`;
  updated = updated.slice(0, insertPoint) + '\n' + routeLine + updated.slice(insertPoint);

  await writeFile(filePath, updated, 'utf-8');
}
