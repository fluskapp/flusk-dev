/**
 * Entity schema validator — orchestrates all validation rules.
 *
 * WHY: Single entry point for validation. Runs shape checks,
 * semantic rules, duplicate detection, and cross-entity
 * dependency validation in one call.
 */

import { createLogger } from '@flusk/logger';
import { validateShape } from './shape-validator.js';
import { validateSemantics } from './semantic-rules.js';
import { buildDependencyGraph, detectCircularDeps } from './dependency-graph.js';
import type { EntitySchema } from './entity-schema.types.js';
import type { SchemaError } from './shape-validator.js';

const logger = createLogger({ name: 'schema:validator' });

/**
 * Validate a single entity schema (shape + semantics).
 * Returns array of errors (empty = valid).
 */
export function validateEntitySchema(schema: EntitySchema): SchemaError[] {
  logger.debug({ name: schema.name }, 'Validating entity schema');
  const shapeErrors = validateShape(schema);
  if (shapeErrors.length > 0) return shapeErrors;

  return validateSemantics(schema);
}

/**
 * Validate multiple entities together (cross-entity checks).
 * Checks for duplicate names and circular dependencies.
 */
export function validateEntitySchemas(
  schemas: EntitySchema[],
): SchemaError[] {
  const errors: SchemaError[] = [];

  // Check duplicates
  const names = new Set<string>();
  for (const s of schemas) {
    if (names.has(s.name)) {
      errors.push({ path: s.name, message: 'Duplicate entity name' });
    }
    names.add(s.name);
    errors.push(...validateEntitySchema(s));
  }

  // Check circular deps
  const graph = buildDependencyGraph(schemas);
  errors.push(...detectCircularDeps(graph));

  logger.info({ count: schemas.length, errors: errors.length },
    'Multi-entity validation complete');
  return errors;
}
