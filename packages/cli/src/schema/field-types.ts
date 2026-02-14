/** @generated —
 * Field type definitions for entity YAML schemas.
 *
 * WHY: Centralizing field types ensures every part of the pipeline
 * (parser, validator, generators) agrees on what types exist.
 */

/** Primitive and composite field types supported in YAML schemas */
export const FIELD_TYPES = [
  'string',
  'integer',
  'number',
  'boolean',
  'uuid',
  'date',
  'email',
  'enum',
  'reference',
  'json',
  'array',
] as const;

/** Union of all valid field type strings */
export type FieldType = (typeof FIELD_TYPES)[number];

/** SQLite column type mapping for each field type */
export const SQLITE_TYPE_MAP: Record<FieldType, string> = {
  string: 'TEXT',
  integer: 'INTEGER',
  number: 'REAL',
  boolean: 'INTEGER',
  uuid: 'TEXT',
  date: 'TEXT',
  email: 'TEXT',
  enum: 'TEXT',
  reference: 'TEXT',
  json: 'TEXT',
  array: 'TEXT',
};
