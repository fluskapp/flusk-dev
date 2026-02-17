/**
 * @generated from packages/schema/entities/budget-alert.entity.yaml
 * Hash: cf3347bc71c1173fd8aa87b760d901b10fde1786f8ad1dda9c99bb315fe718db
 * Generated: 2026-02-17T11:06:33.133Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
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

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---