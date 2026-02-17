/**
 * Tests for Python pricing + instrumentation generators.
 */

import { describe, it, expect } from 'vitest';
import { renderPythonPricing } from '../../templates/python/pricing.template.js';
import { renderPythonInstrumentation } from '../../templates/python/instrumentation.template.js';
import type { ProviderYaml } from '../provider-yaml.types.js';

const mockProvider: ProviderYaml = {
  name: 'openai',
  displayName: 'OpenAI',
  sdkPackage: 'openai',
  clientClass: 'OpenAI',
  methods: [{ name: 'chat.completions.create', path: 'chat.completions.create', streamParam: 'stream' }],
  spans: { system: 'openai', modelPrefixes: ['gpt-'] },
  apiUrls: ['api.openai.com'],
  models: { 'gpt-4o': { input: 2.5, output: 10.0 }, 'gpt-4o-mini': { input: 0.15, output: 0.6 } },
};

describe('renderPythonPricing', () => {
  it('generates valid Python pricing dict', () => {
    const out = renderPythonPricing(mockProvider);
    expect(out).toContain('# --- BEGIN GENERATED ---');
    expect(out).toContain('# --- END GENERATED ---');
    expect(out).toContain('OPENAI_PRICING: dict[str, dict[str, float]]');
    expect(out).toContain('"gpt-4o": {"input": 2.5, "output": 10}');
    expect(out).toContain('"gpt-4o-mini": {"input": 0.15, "output": 0.6}');
  });
});

describe('renderPythonInstrumentation', () => {
  it('generates valid Python instrumentation module', () => {
    const out = renderPythonInstrumentation(mockProvider);
    expect(out).toContain('# --- BEGIN GENERATED ---');
    expect(out).toContain('# --- END GENERATED ---');
    expect(out).toContain('def patch_openai()');
    expect(out).toContain('from opentelemetry import trace');
    expect(out).toContain('gen_ai.system');
    expect(out).toContain('_wrap_stream');
  });

  it('handles scoped package names', () => {
    const anthropic: ProviderYaml = {
      ...mockProvider,
      name: 'anthropic',
      sdkPackage: '@anthropic-ai/sdk',
      methods: [{ name: 'messages.create', path: 'Messages.prototype.create', streamParam: 'stream' }],
      spans: { system: 'anthropic', modelPrefixes: ['claude-'] },
    };
    const out = renderPythonInstrumentation(anthropic);
    expect(out).toContain('def patch_anthropic()');
    expect(out).toContain('anthropic_ai_sdk');
  });
});
