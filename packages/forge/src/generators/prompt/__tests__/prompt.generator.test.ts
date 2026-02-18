/**
 * Unit tests for prompt generator
 */
import { describe, it, expect } from 'vitest';
import {
  generatePromptTemplateContent,
  generatePromptTypesContent,
  generatePromptPythonContent,
  type PromptSchema,
} from '../prompt.generator.js';

const sampleSchema: PromptSchema = {
  name: 'explain-system',
  domain: 'llm-call',
  description: 'System prompt for LLM cost optimization expert',
  template: 'You are an expert.\n\n{{pricing_table}}\n{{usage_data}}\n{{patterns}}',
  variables: [
    { name: 'pricing_table', type: 'string', description: 'Pricing table' },
    { name: 'usage_data', type: 'string', description: 'Usage data' },
    { name: 'patterns', type: 'string', description: 'Detected patterns' },
  ],
};

describe('Prompt Generator', () => {
  it('generates prompt template with GENERATED markers', () => {
    const content = generatePromptTemplateContent(sampleSchema);
    expect(content).toContain('// --- BEGIN GENERATED ---');
    expect(content).toContain('// --- END GENERATED ---');
    expect(content).toContain('renderExplainSystem');
    expect(content).toContain('ExplainSystemVariables');
  });

  it('generates types file', () => {
    const content = generatePromptTypesContent(sampleSchema);
    expect(content).toContain('ExplainSystemVariables');
    expect(content).toContain('pricingTable: string');
    expect(content).toContain('usageData: string');
  });

  it('generates Python prompt', () => {
    const content = generatePromptPythonContent(sampleSchema);
    expect(content).toContain('# --- BEGIN GENERATED ---');
    expect(content).toContain('# --- END GENERATED ---');
    expect(content).toContain('render_explain_system');
    expect(content).toContain('EXPLAIN_SYSTEM_TEMPLATE');
  });
});
