/**
 * @flusk/types
 *
 * TypeScript types and JSON Schema exports generated from entity definitions.
 * This package bridges the gap between TypeBox schemas and runtime consumers.
 */

export {
  // Types
  type LLMCallEntity,
  type TokenUsage,
  type BaseEntity,
  type LLMCallInsert,
  type LLMCallUpdate,
  type LLMCallQuery,

  // JSON Schemas
  LLMCallEntityJSONSchema,
  TokenUsageJSONSchema,
  LLMCallInsertSchema,
  LLMCallUpdateSchema,
  LLMCallQuerySchema
} from './llm-call.types.js';

export {
  // Pattern Types
  type PatternEntity,
  type PatternInsert,
  type PatternUpdate,
  type PatternQuery,

  // Pattern JSON Schemas
  PatternEntityJSONSchema,
  PatternInsertSchema,
  PatternUpdateSchema,
  PatternQuerySchema
} from './pattern.types.js';

export {
  // Conversion Types
  type ConversionEntity,
  type ConversionType,
  type ConversionStatus,
  type ConversionConfig,
  type ConversionInsert,
  type ConversionUpdate,
  type ConversionQuery,

  // Conversion JSON Schemas
  ConversionEntityJSONSchema,
  ConversionInsertSchema,
  ConversionUpdateSchema,
  ConversionQuerySchema
} from './conversion.types.js';
