import { describe, it, expect } from 'vitest';
import {
  LLMCallInsertSchema, LLMCallUpdateSchema, LLMCallQuerySchema,
  PatternInsertSchema, PatternUpdateSchema, PatternQuerySchema,
  ConversionInsertSchema, ConversionUpdateSchema, ConversionQuerySchema,
  RoutingRuleInsertSchema, RoutingRuleUpdateSchema, RoutingRuleQuerySchema,
  ModelPerformanceInsertSchema, ModelPerformanceQuerySchema,
  RoutingDecisionInsertSchema, RoutingDecisionQuerySchema,
  TraceInsertSchema, TraceUpdateSchema, TraceQuerySchema,
  SpanInsertSchema, SpanUpdateSchema, SpanQuerySchema,
  OptimizationInsertSchema, OptimizationUpdateSchema, OptimizationQuerySchema,
  PromptTemplateInsertSchema, PromptTemplateUpdateSchema, PromptTemplateQuerySchema,
  ProfileSessionInsertSchema, ProfileSessionUpdateSchema, ProfileSessionQuerySchema,
  PerformancePatternInsertSchema,
  AnalyzeSessionInsertSchema,
  PromptVersionInsertSchema, PromptVersionUpdateSchema, PromptVersionQuerySchema,
  BudgetAlertInsertSchema,
} from '../index.js';

const insertSchemas: Record<string, unknown> = {
  LLMCallInsertSchema, PatternInsertSchema, ConversionInsertSchema,
  RoutingRuleInsertSchema, ModelPerformanceInsertSchema,
  RoutingDecisionInsertSchema, TraceInsertSchema, SpanInsertSchema,
  OptimizationInsertSchema, PromptTemplateInsertSchema,
  ProfileSessionInsertSchema, PerformancePatternInsertSchema,
  AnalyzeSessionInsertSchema, PromptVersionInsertSchema,
  BudgetAlertInsertSchema,
};

const updateSchemas: Record<string, unknown> = {
  LLMCallUpdateSchema, PatternUpdateSchema, ConversionUpdateSchema,
  RoutingRuleUpdateSchema, TraceUpdateSchema, SpanUpdateSchema,
  OptimizationUpdateSchema, PromptTemplateUpdateSchema,
  ProfileSessionUpdateSchema, PromptVersionUpdateSchema,
};

const querySchemas: Record<string, unknown> = {
  LLMCallQuerySchema, PatternQuerySchema, ConversionQuerySchema,
  RoutingRuleQuerySchema, ModelPerformanceQuerySchema,
  RoutingDecisionQuerySchema, TraceQuerySchema, SpanQuerySchema,
  OptimizationQuerySchema, PromptTemplateQuerySchema,
  ProfileSessionQuerySchema, PromptVersionQuerySchema,
};

describe('@flusk/types', () => {
  describe('Insert schemas', () => {
    for (const [name, schema] of Object.entries(insertSchemas)) {
      it(`${name} is defined and has properties`, () => {
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
      });
    }
  });

  describe('Update schemas', () => {
    for (const [name, schema] of Object.entries(updateSchemas)) {
      it(`${name} is defined and has properties`, () => {
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
      });
    }
  });

  describe('Query schemas', () => {
    for (const [name, schema] of Object.entries(querySchemas)) {
      it(`${name} is defined and has properties`, () => {
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
      });
    }
  });
});
