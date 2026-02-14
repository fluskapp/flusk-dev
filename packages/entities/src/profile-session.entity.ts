/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * HotspotEntry schema - represents a hot function from profiling
 */
export const HotspotEntrySchema = Type.Object({
  functionName: Type.String({ description: 'Function name' }),
  filePath: Type.String({ description: 'Source file path' }),
  cpuPercent: Type.Number({ description: 'CPU percentage', minimum: 0 }),
  samples: Type.Integer({ description: 'Sample count', minimum: 0 }),
});

export type HotspotEntry = Static<typeof HotspotEntrySchema>;

/**
 * ProfileSessionEntity schema - captures profiling session data
 * from @platformatic/flame integration
 */
export const ProfileSessionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    name: Type.String({ description: 'User label', minLength: 1 }),
    type: Type.Union([Type.Literal('cpu'), Type.Literal('heap')], {
      description: 'Profile type',
    }),
    durationMs: Type.Integer({ description: 'Profiling duration in ms', minimum: 0 }),
    totalSamples: Type.Integer({ description: 'Total samples from flame', minimum: 0 }),
    hotspots: Type.Array(HotspotEntrySchema, {
      description: 'Top-N hotspot functions',
    }),
    markdownRaw: Type.String({ description: 'Full flame markdown output' }),
    pprofPath: Type.String({ description: 'Path to .pb file' }),
    flamegraphPath: Type.String({ description: 'Path to .html file' }),
    traceIds: Type.Array(Type.String(), {
      description: 'Linked OTel trace IDs',
    }),
    organizationId: Type.Optional(Type.String({
      description: 'Organization ID for multi-tenant',
      minLength: 1,
    })),
    startedAt: Type.String({
      format: 'date-time',
      description: 'ISO datetime when profiling started',
    }),
  }),
]);

export type ProfileSessionEntity = Static<typeof ProfileSessionEntitySchema>;
