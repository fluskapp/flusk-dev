/**
 * @generated from packages/schema/entities/conversion.entity.yaml
 * Hash: cf2da9cd12469b01b53e59d1f0606559287530637fdb3638addabab3c72ca2e3
 * Generated: 2026-02-17T11:06:33.138Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * ConversionEntity schema
 * @generated from Conversion YAML definition
 */
export const ConversionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    patternId: Type.String({ format: 'uuid', description: 'Reference to the pattern this conversion applies to' }),
    organizationId: Type.String({ format: 'uuid', description: 'Organization that owns this conversion' }),
    conversionType: Type.Union([Type.Literal('cache'), Type.Literal('downgrade'), Type.Literal('remove')]),
    status: Type.Union([Type.Literal('suggested'), Type.Literal('accepted'), Type.Literal('rejected')]),
    estimatedSavings: Type.Number({ description: 'Projected monthly savings in USD if accepted', minimum: 0 }),
    config: Type.Unknown({ description: 'Type-specific configuration (cache TTL, model swap details, or removal reason)' })
  })
]);

export type ConversionEntity = Static<typeof ConversionEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---