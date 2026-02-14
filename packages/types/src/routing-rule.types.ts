/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { RoutingRuleEntitySchema } from '@flusk/entities';

export type RoutingRuleEntity = Static<typeof RoutingRuleEntitySchema>;

export const RoutingRuleEntityJSONSchema = RoutingRuleEntitySchema;

export const RoutingRuleInsertSchema = Type.Omit(RoutingRuleEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);
export type RoutingRuleInsert = Static<typeof RoutingRuleInsertSchema>;

export const RoutingRuleUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(RoutingRuleEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);
export type RoutingRuleUpdate = Static<typeof RoutingRuleUpdateSchema>;

export const RoutingRuleQuerySchema = Type.Partial(RoutingRuleEntitySchema);
export type RoutingRuleQuery = Static<typeof RoutingRuleQuerySchema>;
