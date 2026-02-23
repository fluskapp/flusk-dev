/**
 * Generate row-to-entity.ts for an entity.
 */

import type { EntityDef } from './types.js';
import { HEADER } from './types.js';

export function genRowToEntity(entity: EntityDef): string {
  const { entityType, fields, extraImports } = entity;

  // Build import line
  const importTypes = [entityType, ...(extraImports ?? [])].join(', ');

  // Build field mappings
  const mappings = fields.map((f) => {
    if (f.kind === 'json') {
      if (f.optional) {
        if (f.jsonType) {
          return `    ${f.camel}: row.${f.snake} != null ? JSON.parse(row.${f.snake} as string) as ${f.jsonType} : undefined,`;
        }
        return `    ${f.camel}: row.${f.snake} != null ? JSON.parse(row.${f.snake} as string) : undefined,`;
      }
      if (f.jsonType) {
        return `    ${f.camel}: JSON.parse(row.${f.snake} as string) as ${f.jsonType},`;
      }
      return `    ${f.camel}: JSON.parse(row.${f.snake} as string),`;
    }
    if (f.kind === 'boolean') {
      return `    ${f.camel}: Boolean(row.${f.snake}),`;
    }
    if (f.kind === 'datetime') {
      if (f.optional) {
        return `    ${f.camel}: row.${f.snake} != null ? toISOString(row.${f.snake}) : undefined,`;
      }
      return `    ${f.camel}: toISOString(row.${f.snake}),`;
    }
    if (f.optional) {
      return `    ${f.camel}: (row.${f.snake} as string) ?? undefined,`;
    }
    if (f.entityFieldCast) {
      return `    ${f.camel}: row.${f.snake} as ${entityType}['${f.camel}'],`;
    }
    if (f.castAs) {
      return `    ${f.camel}: row.${f.snake} as ${f.castAs},`;
    }
    if (f.kind === 'number' || f.kind === 'integer') {
      return `    ${f.camel}: row.${f.snake} as number,`;
    }
    return `    ${f.camel}: row.${f.snake} as string,`;
  });

  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { ${importTypes} } from '@flusk/entities';
import { toISOString } from '../../../shared/map-row.js';

/** Convert SQLite row to ${entityType} */
export function rowToEntity(row: Record<string, unknown>): ${entityType} {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
${mappings.join('\n')}
  };
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}
