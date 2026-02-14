/**
 * @generated from RoutingDecision YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { RoutingDecisionEntitySchema } from '@flusk/entities';

export type RoutingDecisionEntity = Static<typeof RoutingDecisionEntitySchema>;

export const RoutingDecisionEntityJSONSchema = RoutingDecisionEntitySchema;

export const RoutingDecisionInsertSchema = Type.Omit(RoutingDecisionEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type RoutingDecisionInsert = Static<typeof RoutingDecisionInsertSchema>;

export const RoutingDecisionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(RoutingDecisionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type RoutingDecisionUpdate = Static<typeof RoutingDecisionUpdateSchema>;

export const RoutingDecisionQuerySchema = Type.Partial(RoutingDecisionEntitySchema);

export type RoutingDecisionQuery = Static<typeof RoutingDecisionQuerySchema>;
