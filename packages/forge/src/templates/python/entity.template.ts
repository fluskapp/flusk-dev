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

/** Fields inherited from FluskBaseModel — skip in entity body */
const BASE_FIELDS = new Set(['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt']);

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
  const fields = Object.entries(schema.fields)
    .filter(([name]) => !BASE_FIELDS.has(name));
  const fieldTypes = fields.map(([, f]) => f.type as FieldType);
  const extraImports = collectImports(fieldTypes);
  const needsField = fields.some(([, f]) => buildFieldKwargs(f) !== '');

  const imports = [
    '# --- BEGIN GENERATED ---',
    `"""${schema.name} entity model."""`,
    '',
    ...extraImports,
    ...(needsField ? ['from pydantic import Field'] : []),
    'from flusk.entities.base import FluskBaseModel',
    '',
  ];

  const required = fields.filter(([, f]) => f.required && f.default === undefined);
  const optional = fields.filter(([, f]) => !f.required || f.default !== undefined);
  const ordered = [...required, ...optional];
  const fieldLines = ordered.map(([n, f]) => renderField(n, f));

  const lines = [
    ...imports,
    `class ${schema.name}(FluskBaseModel):`,
    `    """${schema.description || schema.name + ' entity.'}"""`,
    '',
    ...(fieldLines.length > 0 ? fieldLines : ['    pass']),
    '# --- END GENERATED ---',
    '',
  ];

  return lines.join('\n');
}

/** Generate the base entity module content */
export function renderBaseEntityTemplate(): string {
  return [
    '# --- BEGIN GENERATED ---',
    '"""Base entity model with id and timestamps."""',
    '',
    'from pydantic import BaseModel, Field',
    'from uuid import uuid4, UUID',
    'from datetime import datetime, timezone',
    '',
    '',
    'class FluskBaseModel(BaseModel):',
    '    """Base model with id, created_at, updated_at."""',
    '',
    '    id: UUID = Field(default_factory=uuid4)',
    '    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))',
    '    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))',
    '# --- END GENERATED ---',
    '',
  ].join('\n');
}
