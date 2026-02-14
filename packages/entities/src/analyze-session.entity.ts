/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * AnalyzeSessionEntity schema — tracks CLI analyze runs.
 * Created when `flusk analyze <script>` executes.
 */
export const AnalyzeSessionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    script: Type.String({
      description: 'Script path that was analyzed',
      minLength: 1,
    }),
    durationMs: Type.Integer({
      description: 'Total analysis duration in milliseconds',
      minimum: 0,
    }),
    totalCalls: Type.Integer({
      description: 'Total LLM calls captured',
      minimum: 0,
      default: 0,
    }),
    totalCost: Type.Number({
      description: 'Total cost in USD',
      minimum: 0,
      default: 0,
    }),
    modelsUsed: Type.Array(Type.String(), {
      description: 'List of model identifiers used',
      default: [],
    }),
    startedAt: Type.String({
      format: 'date-time',
      description: 'ISO datetime when analysis started',
    }),
    completedAt: Type.Optional(Type.String({
      format: 'date-time',
      description: 'ISO datetime when analysis completed',
    })),
  }),
]);

export type AnalyzeSessionEntity = Static<
  typeof AnalyzeSessionEntitySchema
>;
