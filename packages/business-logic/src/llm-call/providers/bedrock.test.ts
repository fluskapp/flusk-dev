import { describe, it, expect } from 'vitest';
import { BEDROCK_PRICING } from './bedrock.pricing.js';
import {
  BEDROCK_SYSTEM_VALUES,
  BEDROCK_MODEL_PREFIXES,
  normalizBedrockModelId,
} from './bedrock.span-config.js';
import { calculateCost } from '../calculate-cost.function.js';

describe('bedrock pricing', () => {
  it('should have pricing for claude models', () => {
    expect(BEDROCK_PRICING['anthropic.claude-3-5-sonnet']).toEqual({
      input: 3.0, output: 15.0,
    });
    expect(BEDROCK_PRICING['anthropic.claude-3-haiku']).toEqual({
      input: 0.25, output: 1.25,
    });
  });

  it('should have pricing for titan models', () => {
    expect(BEDROCK_PRICING['amazon.titan-text-express']).toEqual({
      input: 0.2, output: 0.6,
    });
  });

  it('should calculate bedrock costs', () => {
    const result = calculateCost({
      providerName: 'bedrock',
      modelName: 'anthropic.claude-3-haiku',
      tokenUsage: { input: 1000, output: 500, total: 1500 },
    });
    const expected = (1000 / 1_000_000) * 0.25 + (500 / 1_000_000) * 1.25;
    expect(result.costUsd).toBeCloseTo(expected);
  });
});

describe('bedrock span detection', () => {
  it('should detect aws.bedrock system value', () => {
    expect(BEDROCK_SYSTEM_VALUES).toContain('aws.bedrock');
    expect(BEDROCK_SYSTEM_VALUES).toContain('aws_bedrock');
  });

  it('should have model prefixes', () => {
    expect(BEDROCK_MODEL_PREFIXES).toContain('anthropic.');
    expect(BEDROCK_MODEL_PREFIXES).toContain('amazon.titan');
  });
});

describe('normalizBedrockModelId', () => {
  it('should strip version suffixes', () => {
    expect(normalizBedrockModelId('anthropic.claude-3-sonnet-20240229-v1:0'))
      .toBe('anthropic.claude-3-sonnet');
    expect(normalizBedrockModelId('amazon.titan-text-express-v1:0'))
      .toBe('amazon.titan-text-express');
  });

  it('should keep clean model IDs unchanged', () => {
    expect(normalizBedrockModelId('anthropic.claude-3-haiku'))
      .toBe('anthropic.claude-3-haiku');
  });
});
