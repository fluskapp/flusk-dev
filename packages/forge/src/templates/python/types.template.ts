/**
 * Python types template — Insert/Update/Query TypedDicts.
 *
 * WHY: Generates typed dictionaries for database operations,
 * matching the pattern used in the TypeScript types package.
 */

import type { EntitySchema } from '../../schema/entity-schema.types.js';
import type { FieldType } from '../../schema/field-types.js';
import { pythonType, collectImports } from '../../generators/python/type-map.js';
import { toSnakeCase } from '../../generators/utils.js';

/** Render a TypedDict class */
function renderTypedDict(
  name: string,
  fields: Array<[string, string, boolean]>,
): string[] {
  const lines = [`class ${name}(TypedDict, total=False):`];
  for (const [fname, ftype, required] of fields) {
    const comment = required ? '' : '  # optional';
    lines.push(`    ${fname}: ${ftype}${comment}`);
  }
  if (fields.length === 0) lines.push('    pass');
  return lines;
}

/** Generate Insert/Update/Query types content */
export function renderTypesTemplate(schema: EntitySchema): string {
  const entries = Object.entries(schema.fields);
  const fieldTypes = entries.map(([, f]) => f.type as FieldType);
  const extraImports = collectImports(fieldTypes);

  const insertFields = entries.map(([n, f]) => [
    toSnakeCase(n), pythonType(f.type), !!f.required,
  ] as [string, string, boolean]);

  const updateFields = entries.map(([n, f]) => [
    toSnakeCase(n), pythonType(f.type), false,
  ] as [string, string, boolean]);

  const queryFields = entries
    .filter(([, f]) => f.index)
    .map(([n, f]) => [
      toSnakeCase(n), pythonType(f.type), false,
    ] as [string, string, boolean]);

  const lines = [
    '# --- BEGIN GENERATED ---',
    `"""${schema.name} operation types."""`,
    '',
    ...extraImports,
    'from typing import TypedDict',
    '',
    ...renderTypedDict(`${schema.name}Insert`, insertFields),
    '',
    ...renderTypedDict(`${schema.name}Update`, updateFields),
    '',
    ...renderTypedDict(`${schema.name}Query`, queryFields),
    '# --- END GENERATED ---',
    '',
  ];

  return lines.join('\n');
}
