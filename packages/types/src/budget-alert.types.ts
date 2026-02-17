/**
 * @generated from packages/schema/entities/budget-alert.entity.yaml
 * Hash: cf3347bc71c1173fd8aa87b760d901b10fde1786f8ad1dda9c99bb315fe718db
 * Generated: 2026-02-17T11:06:33.133Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from BudgetAlert YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { BudgetAlertEntitySchema } from '@flusk/entities';

export type BudgetAlertEntity = Static<typeof BudgetAlertEntitySchema>;

export const BudgetAlertEntityJSONSchema = BudgetAlertEntitySchema;

export const BudgetAlertInsertSchema = Type.Omit(BudgetAlertEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type BudgetAlertInsert = Static<typeof BudgetAlertInsertSchema>;

export const BudgetAlertUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(BudgetAlertEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type BudgetAlertUpdate = Static<typeof BudgetAlertUpdateSchema>;

export const BudgetAlertQuerySchema = Type.Partial(BudgetAlertEntitySchema);

export type BudgetAlertQuery = Static<typeof BudgetAlertQuerySchema>;

// --- END GENERATED ---