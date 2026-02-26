import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  BaseEntitySchema,
  TokenUsageSchema,
  HotspotEntrySchema,
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
  AnalyzeSessionEntitySchema,
  PromptVersionEntitySchema,
  BudgetAlertEntitySchema,
  InsightEntitySchema,
  ExplainSessionEntitySchema,
  TrainingPairEntitySchema,
  TrainingDatasetEntitySchema,
} from '../src/index.js';

const schemas = {
  BaseEntitySchema,
  TokenUsageSchema,
  HotspotEntrySchema,
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
  AnalyzeSessionEntitySchema,
  PromptVersionEntitySchema,
  BudgetAlertEntitySchema,
  InsightEntitySchema,
  ExplainSessionEntitySchema,
  TrainingPairEntitySchema,
  TrainingDatasetEntitySchema,
};

describe('Entity schemas', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    describe(name, () => {
      it('compiles and validates (rejects empty object)', () => {
        // Every schema should be a valid TypeBox schema object
        expect(schema).toBeDefined();
        expect(schema.type).toBe('object');

        // An empty object should fail validation for schemas with required fields
        const errors = [...Value.Errors(schema, {})];
        if (schema.required && schema.required.length > 0) {
          expect(errors.length).toBeGreaterThan(0);
        }
      });

      it('rejects invalid types for required fields', () => {
        // Build an object with all required fields set to wrong types
        if (!schema.properties) return;
        const badObj: Record<string, unknown> = {};
        for (const key of Object.keys(schema.properties)) {
          badObj[key] = Symbol('bad'); // Symbol is never valid in JSON schemas
        }
        const valid = Value.Check(schema, badObj);
        expect(valid).toBe(false);
      });
    });
  }

  describe('TokenUsageSchema', () => {
    it('accepts valid token usage', () => {
      expect(Value.Check(TokenUsageSchema, { input: 10, output: 20, total: 30 })).toBe(true);
    });

    it('rejects negative values', () => {
      expect(Value.Check(TokenUsageSchema, { input: -1, output: 20, total: 30 })).toBe(false);
    });
  });
});
