/**
 * Barrel export updaters for entities, types, resources, business-logic
 */

import { resolve } from 'node:path';
import { toPascalCase, toCamelCase } from './utils.js';
import { appendIfMissing } from './barrel-updater-helpers.js';

/** Update packages/entities/src/index.ts */
export async function updateEntitiesBarrel(
  entityName: string,
  root: string,
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

/** Update packages/types/src/index.ts */
export async function updateTypesBarrel(
  entityName: string,
  root: string,
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

/** Update packages/resources/src/index.ts */
export async function updateResourcesBarrel(
  entityName: string,
  root: string,
): Promise<void> {
  const pascalName = toPascalCase(entityName);
  const filePath = resolve(root, 'packages/resources/src/index.ts');
  const marker = `${entityName}.repository.js`;
  const exportLine =
    `export * as ${pascalName}Repository from './repositories/${entityName}.repository.js';`;
  await appendIfMissing(filePath, marker, exportLine);
}

/** Update packages/business-logic/src/index.ts */
export async function updateBusinessLogicBarrel(
  entityName: string,
  root: string,
): Promise<void> {
  const camelName = toCamelCase(entityName);
  const filePath = resolve(root, 'packages/business-logic/src/index.ts');
  const marker = `./${entityName}/index.js`;
  const exportLine = `import * as ${camelName} from './${entityName}/index.js';\nexport { ${camelName} };`;
  await appendIfMissing(filePath, marker, exportLine);
}
