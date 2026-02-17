/**
 * @generated from packages/schema/entities/routing-decision.entity.yaml
 * Hash: 37adb813a69b1bd8dd46d2aef5b36aa3cc858f3f9698453130c46842b4313322
 * Generated: 2026-02-17T11:06:33.202Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
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

// --- END GENERATED ---