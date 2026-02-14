/**
 * TypeBox entity schema generator from YAML.
 *
 * WHY: Generates the @flusk/entities TypeBox schema file
 * from a YAML definition. This replaces hand-writing
 * TypeBox schemas — the YAML is the source of truth.
 */

import type { EntitySchema } from './entity-schema.types.js';
import type { FieldSchema } from './field-schema.types.js';

/**
 * Generate TypeBox entity schema file content from an EntitySchema.
 * Produces a complete .entity.ts file for @flusk/entities.
 */
export function generateTypeBoxContent(schema: EntitySchema): string {
  const fields = Object.entries(schema.fields)
    .map(([name, f]) => `    ${name}: ${fieldToTypeBox(f)}`)
    .join(',\n');

  return `import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * ${schema.name}Entity schema
 * @generated from ${schema.name} YAML definition
 */
export const ${schema.name}EntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
${fields}
  })
]);

export type ${schema.name}Entity = Static<typeof ${schema.name}EntitySchema>;
`;
}

/** Convert a FieldSchema to a TypeBox expression string */
function fieldToTypeBox(field: FieldSchema): string {
  const opts = buildTypeBoxOptions(field);
  let expr = typeBoxExpression(field, opts);

  if (!field.required) {
    expr = `Type.Optional(${expr})`;
  }
  return expr;
}

/** Build the options object string for TypeBox */
function buildTypeBoxOptions(field: FieldSchema): string {
  const parts: string[] = [];
  if (field.description) parts.push(`description: '${field.description}'`);
  if (field.min !== undefined) parts.push(`minimum: ${field.min}`);
  if (field.max !== undefined) parts.push(`maximum: ${field.max}`);
  if (field.default !== undefined) {
    const val = typeof field.default === 'string'
      ? `'${field.default}'` : String(field.default);
    parts.push(`default: ${val}`);
  }
  return parts.length ? `{ ${parts.join(', ')} }` : '';
}

/** Map field type to TypeBox expression */
function typeBoxExpression(field: FieldSchema, opts: string): string {
  const o = opts ? opts : '{}';
  switch (field.type) {
    case 'string': return `Type.String(${opts || ''})`.replace('()', '()');
    case 'integer': return `Type.Integer(${o})`;
    case 'number': return `Type.Number(${o})`;
    case 'boolean': return `Type.Boolean(${o})`;
    case 'uuid': return `Type.String({ format: 'uuid'${opts ? ', ' + opts.slice(2) : ' }'})`;
    case 'date': return `Type.String({ format: 'date-time'${opts ? ', ' + opts.slice(2) : ' }'})`;
    case 'email': return `Type.String({ format: 'email'${opts ? ', ' + opts.slice(2) : ' }'})`;
    case 'enum': {
      const literals = (field.values ?? [])
        .map((v) => `Type.Literal('${v}')`)
        .join(', ');
      return `Type.Union([${literals}])`;
    }
    case 'json': return `Type.Unknown(${o})`;
    case 'array': return `Type.Array(Type.Unknown())`;
    case 'reference': return `Type.String({ format: 'uuid' })`;
    default: return `Type.String(${opts || ''})`;
  }
}
