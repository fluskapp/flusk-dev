/**
 * Row-to-entity mapping builder for CRUD trait code generation.
 */

import type { FieldSchema } from '../schema/index.js';

/** Convert camelCase to snake_case */
export function toSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Build a single field mapping line for rowToEntity */
function buildFieldMapping(camel: string, snake: string, field: FieldSchema): string {
  const opt = !field.required;
  if (field.type === 'json' || field.type === 'array') {
    return opt
      ? `${camel}: row.${snake} != null ? JSON.parse(row.${snake} as string) : undefined,`
      : `${camel}: JSON.parse(row.${snake} as string),`;
  }
  if (field.type === 'boolean') {
    return opt
      ? `${camel}: row.${snake} != null ? Boolean(row.${snake}) : undefined,`
      : `${camel}: Boolean(row.${snake}),`;
  }
  if (field.type === 'date') {
    return opt
      ? `${camel}: row.${snake} != null ? toISOString(row.${snake}) : undefined,`
      : `${camel}: toISOString(row.${snake}),`;
  }
  if (field.type === 'enum' && field.values) {
    const union = field.values.map((v: string) => `'${v}'`).join(' | ');
    return opt
      ? `${camel}: (row.${snake} as ${union}) ?? undefined,`
      : `${camel}: row.${snake} as ${union},`;
  }
  const cast = field.type === 'number' || field.type === 'integer' ? 'number' : 'string';
  return opt
    ? `${camel}: (row.${snake} as ${cast}) ?? undefined,`
    : `${camel}: row.${snake} as ${cast},`;
}

/** Build rowToEntity mapper with proper type conversions */
export function buildRowToEntity(n: string, fields: [string, FieldSchema][]): string {
  const mappings = [
    `    id: row.id as string,`,
    `    createdAt: toISOString(row.created_at),`,
    `    updatedAt: toISOString(row.updated_at),`,
    ...fields.map(([name, field]) => `    ${buildFieldMapping(name, toSnake(name), field)}`),
  ];
  return [
    `function toISOString(value: unknown): string {`,
    `  if (typeof value === 'string') return value;`,
    `  if (value && typeof value === 'object' && 'toISOString' in value) {`,
    `    return (value as { toISOString(): string }).toISOString();`,
    `  }`,
    `  return String(value);`,
    `}`,
    ``,
    `/** Convert a SQLite row (snake_case) to ${n}Entity (camelCase) */`,
    `function rowToEntity(row: Record<string, unknown>): ${n}Entity {`,
    `  return {`,
    ...mappings,
    `  };`,
    `}`,
  ].join('\n');
}

/** Build toSnake + convertValueForDb helpers for generated code */
export function buildHelpers(fields: [string, FieldSchema][]): string {
  const jsonF = fields.filter(([, f]) => f.type === 'json' || f.type === 'array').map(([n]) => `'${n}'`);
  const boolF = fields.filter(([, f]) => f.type === 'boolean').map(([n]) => `'${n}'`);
  const checks: string[] = [];
  if (jsonF.length > 0) checks.push(`  if (new Set([${jsonF.join(', ')}]).has(key)) return JSON.stringify(value);`);
  if (boolF.length > 0) checks.push(`  if (new Set([${boolF.join(', ')}]).has(key)) return value ? 1 : 0;`);
  const keyParam = checks.length > 0 ? 'key' : '_key';
  return [
    `function toSnake(s: string): string { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); }`,
    `function convertValueForDb(${keyParam}: string, value: unknown): null | number | bigint | string {`,
    ...checks,
    `  return (value ?? null) as null | number | bigint | string;`,
    `}`,
  ].join('\n');
}
