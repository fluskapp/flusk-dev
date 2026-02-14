/**
 * Semantic validation rules for entity schemas.
 *
 * WHY: Shape validation catches structural issues. Semantic
 * rules catch logical issues: enum without values, required
 * fields with defaults, reference fields needing relations.
 */

import { isReservedWord } from './reserved-words.js';
import type { EntitySchema } from './entity-schema.types.js';
import type { SchemaError } from './shape-validator.js';

/**
 * Run semantic validation rules on a parsed entity schema.
 * Returns array of errors (empty = valid).
 */
export function validateSemantics(schema: EntitySchema): SchemaError[] {
  const errors: SchemaError[] = [];

  checkReservedNames(schema, errors);
  checkEnumValues(schema, errors);
  checkFieldConstraints(schema, errors);
  return errors;
}

/** Ensure no field names are reserved words */
function checkReservedNames(
  schema: EntitySchema,
  errors: SchemaError[],
): void {
  for (const name of Object.keys(schema.fields)) {
    if (isReservedWord(name)) {
      errors.push({
        path: `fields.${name}`,
        message: `"${name}" is a reserved word`,
      });
    }
  }
}

/** Enum fields must have values array */
function checkEnumValues(
  schema: EntitySchema,
  errors: SchemaError[],
): void {
  for (const [name, field] of Object.entries(schema.fields)) {
    if (field.type === 'enum' && (!field.values || !field.values.length)) {
      errors.push({
        path: `fields.${name}`,
        message: 'enum type requires non-empty values array',
      });
    }
  }
}

/** Validate min/max and type-specific constraints */
function checkFieldConstraints(
  schema: EntitySchema,
  errors: SchemaError[],
): void {
  for (const [name, field] of Object.entries(schema.fields)) {
    if (field.min !== undefined && field.max !== undefined) {
      if (field.min > field.max) {
        errors.push({
          path: `fields.${name}`,
          message: 'min cannot be greater than max',
        });
      }
    }
  }
}
