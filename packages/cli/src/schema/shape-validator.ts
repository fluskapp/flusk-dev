/** @generated —
 * Shape validator — checks that parsed YAML matches EntitySchema shape.
 *
 * WHY: We validate shape before business rules. This catches
 * typos in field names, wrong types, missing required keys.
 * Separate from semantic validation (circular deps, etc).
 */

import { FIELD_TYPES } from './field-types.js';
import type { FieldType } from './field-types.js';

/** Validation error with context */
export interface SchemaError {
  path: string;
  message: string;
}

/**
 * Validate that parsed YAML has the correct EntitySchema shape.
 * Returns array of errors (empty = valid).
 */
export function validateShape(data: unknown): SchemaError[] {
  const errors: SchemaError[] = [];
  if (!data || typeof data !== 'object') {
    errors.push({ path: '', message: 'Schema must be an object' });
    return errors;
  }

  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name) {
    errors.push({ path: 'name', message: 'name is required (string)' });
  }
  if (!obj.fields || typeof obj.fields !== 'object') {
    errors.push({ path: 'fields', message: 'fields is required (object)' });
    return errors;
  }

  validateFields(obj.fields as Record<string, unknown>, errors);
  return errors;
}

/** Validate each field definition */
function validateFields(
  fields: Record<string, unknown>,
  errors: SchemaError[],
): void {
  for (const [name, def] of Object.entries(fields)) {
    if (!def || typeof def !== 'object') {
      errors.push({ path: `fields.${name}`, message: 'must be an object' });
      continue;
    }
    const field = def as Record<string, unknown>;
    if (!FIELD_TYPES.includes(field.type as FieldType)) {
      errors.push({
        path: `fields.${name}.type`,
        message: `invalid type "${String(field.type)}"`,
      });
    }
  }
}
