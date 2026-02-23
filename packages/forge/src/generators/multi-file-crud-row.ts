/**
 * Row-to-entity file generator for multi-file CRUD.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { toSnake, isJson, isBool, isDate, jsonTypeAlias } from './multi-file-crud-helpers.js';

/** Generate row-to-entity.ts */
export function generateRowToEntity(schema: EntitySchema): string {
  const n = schema.name;
  const fields = Object.entries(schema.fields);

  const jsonTypeImports: string[] = [];
  for (const [name, field] of fields) {
    if (isJson(field)) {
      const alias = jsonTypeAlias(name, field);
      if (alias) jsonTypeImports.push(alias);
    }
  }

  const mappings = fields.map(([name, field]) => {
    const snake = toSnake(name);
    if (isJson(field)) {
      const alias = jsonTypeAlias(name, field);
      const cast = alias ? ` as ${alias}` : '';
      return field.required
        ? `    ${name}: JSON.parse(row.${snake} as string)${cast},`
        : `    ${name}: row.${snake} != null ? JSON.parse(row.${snake} as string)${cast} : undefined,`;
    }
    if (isBool(field)) return `    ${name}: Boolean(row.${snake}),`;
    if (isDate(field)) {
      return field.required
        ? `    ${name}: toISOString(row.${snake}),`
        : `    ${name}: row.${snake} != null ? toISOString(row.${snake}) : undefined,`;
    }
    const cast = field.type === 'number' || field.type === 'integer' ? 'number' : 'string';
    return field.required
      ? `    ${name}: row.${snake} as ${cast},`
      : `    ${name}: (row.${snake} as ${cast}) ?? undefined,`;
  });

  const entityTypes = [n + 'Entity', ...jsonTypeImports];
  const imports = [`import type { ${entityTypes.join(', ')} } from '@flusk/entities';`];
  imports.push(`import { toISOString } from '../../../shared/map-row.js';`);

  return `${imports.join('\n')}\n\n/** Convert SQLite row to ${n}Entity */\nexport function rowToEntity(row: Record<string, unknown>): ${n}Entity {\n  return {\n    id: row.id as string,\n    createdAt: toISOString(row.created_at),\n    updatedAt: toISOString(row.updated_at),\n${mappings.join('\n')}\n  };\n}\n`;
}
