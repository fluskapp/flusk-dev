import { describe, it, expect } from 'vitest';
import { Kind } from '@sinclair/typebox';
import {
  BaseEntitySchema,
  LLMCallEntitySchema,
  PatternEntitySchema,
  ConversionEntitySchema,
  RoutingRuleEntitySchema,
  ModelPerformanceEntitySchema,
  RoutingDecisionEntitySchema,
  TraceEntitySchema,
  SpanEntitySchema,
  OptimizationEntitySchema,
  PromptTemplateEntitySchema,
  ProfileSessionEntitySchema,
  PerformancePatternEntitySchema,
  BudgetAlertEntitySchema,
  PromptVersionEntitySchema,
  AnalyzeSessionEntitySchema,
  TokenUsageSchema,
  HotspotEntrySchema,
} from '../index.js';

const schemas = {
  BaseEntitySchema,
  LLMCallEntitySchema,
  PatternEntitySchema,
  ConversionEntitySchema,
  RoutingRuleEntitySchema,
  ModelPerformanceEntitySchema,
  RoutingDecisionEntitySchema,
  TraceEntitySchema,
  SpanEntitySchema,
  OptimizationEntitySchema,
  PromptTemplateEntitySchema,
  ProfileSessionEntitySchema,
  PerformancePatternEntitySchema,
  BudgetAlertEntitySchema,
  PromptVersionEntitySchema,
  AnalyzeSessionEntitySchema,
  TokenUsageSchema,
  HotspotEntrySchema,
};

describe('@flusk/entities', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name} is a valid TypeBox schema`, () => {
      expect(schema).toBeDefined();
      expect(schema[Kind]).toBe('Object');
      expect(schema.properties).toBeDefined();
      expect(typeof schema.properties).toBe('object');
    });
  }
});
