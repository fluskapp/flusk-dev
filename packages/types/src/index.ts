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

export {
  type RoutingRuleEntity as RoutingRuleEntityType,
  type RoutingRuleInsert,
  type RoutingRuleUpdate,
  type RoutingRuleQuery,
  RoutingRuleEntityJSONSchema,
  RoutingRuleInsertSchema,
  RoutingRuleUpdateSchema,
  RoutingRuleQuerySchema,
} from './routing-rule.types.js';

export {
  type ModelPerformanceEntity as ModelPerformanceEntityType,
  type ModelPerformanceUpsert,
  type ModelPerformanceQuery,
  ModelPerformanceEntityJSONSchema,
  ModelPerformanceUpsertSchema,
  ModelPerformanceQuerySchema,
} from './model-performance.types.js';

export {
  type RoutingDecisionEntity as RoutingDecisionEntityType,
  type RoutingDecisionInsert,
  type RoutingDecisionQuery,
  RoutingDecisionEntityJSONSchema,
  RoutingDecisionInsertSchema,
  RoutingDecisionQuerySchema,
} from './routing-decision.types.js';
