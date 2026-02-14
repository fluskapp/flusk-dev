/** @generated —
 * Types file generator — creates @flusk/types variant files.
 *
 * WHY: Each entity needs Insert/Update/Query schema variants
 * in @flusk/types. This generates the standard pattern from YAML
 * so adding new entities doesn't require copy-pasting boilerplate.
 */

import type { EntitySchema } from './entity-schema.types.js';

/**
 * Generate the @flusk/types file content for an entity.
 * Produces Entity, Insert, Update, and Query type variants.
 */
export function generateTypesFileContent(schema: EntitySchema): string {
  const n = schema.name;

  return `/**
 * @generated from ${n} YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { ${n}EntitySchema } from '@flusk/entities';

export type ${n}Entity = Static<typeof ${n}EntitySchema>;

export const ${n}EntityJSONSchema = ${n}EntitySchema;

export const ${n}InsertSchema = Type.Omit(${n}EntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type ${n}Insert = Static<typeof ${n}InsertSchema>;

export const ${n}UpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(${n}EntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type ${n}Update = Static<typeof ${n}UpdateSchema>;

export const ${n}QuerySchema = Type.Partial(${n}EntitySchema);

export type ${n}Query = Static<typeof ${n}QuerySchema>;
`;
}
