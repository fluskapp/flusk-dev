import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * BudgetAlertEntity schema
 * @generated from BudgetAlert YAML definition
 */
export const BudgetAlertEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    alertType: Type.Union([Type.Literal('daily'), Type.Literal('monthly'), Type.Literal('per-call'), Type.Literal('duplicate-ratio')]),
    threshold: Type.Number({ description: 'The budget limit that was exceeded (USD)', minimum: 0 }),
    actual: Type.Number({ description: 'The actual spending amount (USD)', minimum: 0 }),
    model: Type.Optional(Type.String({ description: 'Model that triggered the alert (if per-call)' })),
    acknowledged: Type.Boolean({ description: 'Whether the user acknowledged this alert', default: false }),
    metadata: Type.Optional(Type.Unknown({ description: 'Additional context (agent labels, time windows, etc.)' }))
  })
]);

export type BudgetAlertEntity = Static<typeof BudgetAlertEntitySchema>;
