/**
 * CRUD routes generator — entity YAML → full Fastify CRUD route file.
 *
 * WHY: 8+ route files are 90% identical CRUD boilerplate. This
 * generator produces a complete route file from an entity name,
 * matching the pattern in budget-alert.routes.ts et al.
 */

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { generateCrudRoutesTemplate } from '../templates/crud-routes.template.js';

export interface CrudRoutesGeneratorOptions {
  entityName: string;
  projectRoot: string;
}

export interface CrudRoutesResult {
  content: string;
  outputPath: string;
}

/**
 * Generate CRUD route file content for an entity.
 * Validates that entity YAML exists before generating.
 */
export function generateCrudRoutes(
  opts: CrudRoutesGeneratorOptions,
): CrudRoutesResult {
  const { entityName, projectRoot } = opts;

  const yamlPath = resolve(
    projectRoot,
    `packages/schema/entities/${entityName}.entity.yaml`,
  );
  if (!existsSync(yamlPath)) {
    throw new Error(
      `Entity YAML not found: ${yamlPath}. ` +
      `Create it first or check the entity name.`,
    );
  }

  const content = generateCrudRoutesTemplate({ entityName });
  const outputPath = resolve(
    projectRoot,
    `packages/execution/src/routes/${entityName}.routes.ts`,
  );

  return { content, outputPath };
}
