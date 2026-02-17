/**
 * Python Pydantic entity template.
 *
 * WHY: Separates template logic from generator orchestration.
 * Keeps both files under 100 lines.
 */

import type { EntitySchema } from '../../schema/entity-schema.types.js';
import type { FieldSchema } from '../../schema/field-schema.types.js';
import type { FieldType } from '../../schema/field-types.js';
import { pythonType, buildFieldKwargs, collectImports } from '../../generators/python/type-map.js';
import { toSnakeCase } from '../../generators/utils.js';

/** Render a single field line */
function renderField(name: string, field: FieldSchema): string {
  const pyName = toSnakeCase(name);
  const pyType = pythonType(field.type);
  const optional = !field.required;
  const typeStr = optional ? `${pyType} | None` : pyType;
  const kwargs = buildFieldKwargs(field);
  const defaultPart = kwargs ? ` = ${kwargs}`
    : optional ? ' = None' : '';
  return `    ${pyName}: ${typeStr}${defaultPart}`;
}

/** Generate full entity file content */
export function renderEntityTemplate(
  schema: EntitySchema,
): string {
  const fields = Object.entries(schema.fields);
  const fieldTypes = fields.map(([, f]) => f.type as FieldType);
  const extraImports = collectImports(fieldTypes);
  const needsField = fields.some(([, f]) => buildFieldKwargs(f) !== '');

  const imports = [
    '# --- BEGIN GENERATED ---',
    `"""${schema.name} entity model."""`,
    '',
    ...extraImports,
    `from pydantic import BaseModel${needsField ? ', Field' : ''}`,
    '',
  ];

  const required = fields.filter(([, f]) => f.required && f.default === undefined);
  const optional = fields.filter(([, f]) => !f.required || f.default !== undefined);
  const ordered = [...required, ...optional];
  const fieldLines = ordered.map(([n, f]) => renderField(n, f));

  const lines = [
    ...imports,
    `class ${schema.name}(BaseModel):`,
    `    """${schema.description || schema.name + ' entity.'}"""`,
    '',
    ...fieldLines,
    '# --- END GENERATED ---',
    '',
  ];

  return lines.join('\n');
}
