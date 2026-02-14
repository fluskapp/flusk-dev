/** @generated —
 * Field-level schema types for entity YAML definitions.
 *
 * WHY: Fields are the atomic building blocks of entities.
 * Each field maps to a TypeBox property and a SQLite column.
 */

import type { FieldType } from './field-types.js';

/** Definition of a single field in an entity YAML */
export interface FieldSchema {
  /** Data type of the field */
  type: FieldType;
  /** Whether the field is required (default: false) */
  required?: boolean;
  /** Whether to create a database index */
  index?: boolean;
  /** Whether the field must be unique */
  unique?: boolean;
  /** Default value for the field */
  default?: string | number | boolean;
  /** Minimum value (numbers) or length (strings) */
  min?: number;
  /** Maximum value (numbers) or length (strings) */
  max?: number;
  /** Numeric precision (for number type) */
  precision?: number;
  /** Human-readable description */
  description?: string;
  /** Allowed values (only for enum type) */
  values?: string[];
  /** Format hint (e.g. 'uuid', 'date-time') */
  format?: string;
}
