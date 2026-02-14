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
