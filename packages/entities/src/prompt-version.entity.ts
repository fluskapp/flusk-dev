/**
 * @generated from packages/schema/entities/prompt-version.entity.yaml
 * Hash: 7a3f844c268eac93e0ab2d32975b9679d716b083900e4cfc02fa9959156d6667
 * Generated: 2026-02-17T11:06:33.199Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * PromptVersionEntity schema
 * @generated from PromptVersion YAML definition
 */
export const PromptVersionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    templateId: Type.String({ format: 'uuid', description: 'Parent template ID' }),
    version: Type.Number({ description: 'Auto-increment version number per template' }),
    content: Type.String({ description: 'Prompt text with {{variable}} placeholders' }),
    metrics: Type.Unknown({ description: 'Performance metrics (avgQuality, avgLatencyMs, avgCost, sampleCount)', default: '{"avgQuality":0,"avgLatencyMs":0,"avgCost":0,"sampleCount":0}' }),
    status: Type.Union([Type.Literal('draft'), Type.Literal('active'), Type.Literal('archived'), Type.Literal('rolled-back')])
  })
]);

export type PromptVersionEntity = Static<typeof PromptVersionEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---