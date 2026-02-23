/**
 * Minimal entity schema stub creator for the feature generator.
 */

import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { toPascalCase } from './utils.js';

/**
 * Create a minimal entity schema stub
 */
export async function createEntityStub(
  entityName: string,
  root: string,
): Promise<void> {
  const pascalName = toPascalCase(entityName);
  const outputPath = resolve(root,
    `packages/entities/src/${entityName}.entity.ts`);

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
