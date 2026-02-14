/** @generated —
 * Entity schema parser — loads YAML and returns typed EntitySchema.
 *
 * WHY: This is the main entry point for loading entity definitions.
 * It combines YAML parsing + shape validation into one call,
 * giving callers a fully typed EntitySchema or clear errors.
 */

import { createLogger } from '@flusk/logger';
import { parseYamlFile } from './parse-yaml-file.js';
import { validateShape } from './shape-validator.js';
import type { EntitySchema } from './entity-schema.types.js';

const logger = createLogger({ name: 'schema:parser' });

/** Error thrown when schema shape validation fails */
export class SchemaValidationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly errors: Array<{ path: string; message: string }>,
  ) {
    const details = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    super(`Schema validation failed for ${filePath}:\n${details}`);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Parse an entity YAML file and return a typed EntitySchema.
 * Throws SchemaValidationError if shape is invalid.
 */
export function parseEntitySchema(filePath: string): EntitySchema {
  logger.info({ filePath }, 'Parsing entity schema');
  const raw = parseYamlFile(filePath);
  const errors = validateShape(raw);

  if (errors.length > 0) {
    logger.error({ filePath, errors }, 'Schema shape validation failed');
    throw new SchemaValidationError(filePath, errors);
  }

  const schema = raw as EntitySchema;
  logger.info({ name: schema.name, fieldCount: Object.keys(schema.fields).length },
    'Entity schema parsed successfully');
  return schema;
}
