import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * ProfileSessionEntity schema
 * @generated from ProfileSession YAML definition
 */
export const ProfileSessionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    name: Type.String({ description: 'User label for the profiling session', minLength: 1 }),
    profileType: Type.Union([Type.Literal('cpu'), Type.Literal('heap')]),
    durationMs: Type.Integer({ description: 'Profiling duration in milliseconds', minimum: 0, default: 0 }),
    totalSamples: Type.Integer({ description: 'Total samples from flame', minimum: 0, default: 0 }),
    hotspots: Type.Unknown({ description: 'Top-N hotspot functions (JSON array)', default: '[]' }),
    markdownRaw: Type.String({ description: 'Full flame markdown output', default: '' }),
    pprofPath: Type.String({ description: 'Path to .pb file', default: '' }),
    flamegraphPath: Type.String({ description: 'Path to .html file', default: '' }),
    traceIds: Type.Unknown({ description: 'Linked OTel trace IDs (JSON array)', default: '[]' }),
    organizationId: Type.Optional(Type.String({ description: 'Organization ID for multi-tenant', minLength: 1 })),
    startedAt: Type.String({ format: 'date-time', description: 'ISO datetime when profiling started' })
  })
]);

export type ProfileSessionEntity = Static<typeof ProfileSessionEntitySchema>;

// --- BEGIN CUSTOM ---
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
// --- END CUSTOM ---
