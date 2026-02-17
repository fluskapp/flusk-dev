/**
 * Python type mapping from YAML field types.
 *
 * WHY: Centralizes YAML → Python type conversion for all
 * Python generators (entities, types, repositories).
 */

import type { FieldType } from '../../schema/field-types.js';
import type { FieldSchema } from '../../schema/field-schema.types.js';

/** Python type string for each YAML field type */
export const PYTHON_TYPE_MAP: Record<FieldType, string> = {
  string: 'str',
  integer: 'int',
  number: 'float',
  boolean: 'bool',
  uuid: 'UUID',
  date: 'datetime',
  email: 'str',
  enum: 'str',
  reference: 'str',
  json: 'dict[str, Any]',
  array: 'list[Any]',
};

/** Imports needed for specific types */
export const PYTHON_IMPORTS: Record<string, string> = {
  uuid: 'from uuid import UUID',
  date: 'from datetime import datetime',
  json: 'from typing import Any',
  array: 'from typing import Any',
};

/** Build Pydantic Field() kwargs from a FieldSchema */
export function buildFieldKwargs(field: FieldSchema): string {
  const args: string[] = [];
  if (field.default !== undefined) {
    const val = typeof field.default === 'string'
      ? `"${field.default}"` : String(field.default);
    args.push(`default=${val}`);
  }
  if (field.description) {
    args.push(`description="${field.description}"`);
  }
  if (field.min !== undefined) args.push(`ge=${field.min}`);
  if (field.max !== undefined) args.push(`le=${field.max}`);
  return args.length > 0 ? `Field(${args.join(', ')})` : '';
}

/** Get Python type string for a field */
export function pythonType(fieldType: FieldType): string {
  return PYTHON_TYPE_MAP[fieldType] ?? 'str';
}

/** Collect unique imports needed for a set of field types */
export function collectImports(types: FieldType[]): string[] {
  const seen = new Set<string>();
  return types
    .filter((t) => PYTHON_IMPORTS[t] && !seen.has(t) && seen.add(t))
    .map((t) => PYTHON_IMPORTS[t]);
}
