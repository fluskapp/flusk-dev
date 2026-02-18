/**
 * Unit tests for action generator
 */
import { describe, it, expect } from 'vitest';
import {
  generateActionYmlContent,
  generateActionIndexContent,
  generateActionTypesContent,
  generateActionTestContent,
  type ActionSchema,
} from '../action.generator.js';

const sampleSchema: ActionSchema = {
  name: 'analyze',
  description: 'Analyze LLM costs in CI/CD pipelines',
  inputs: [
    { name: 'script', description: 'Path to script', required: true },
    { name: 'provider', description: 'LLM provider', required: false, default: 'openai' },
    { name: 'budget', description: 'Max cost', required: false },
  ],
  outputs: [
    { name: 'total-cost', description: 'Total cost in USD' },
    { name: 'total-calls', description: 'Total API calls' },
  ],
};

describe('Action Generator', () => {
  it('generates action.yml with GENERATED markers', () => {
    const content = generateActionYmlContent(sampleSchema);
    expect(content).toContain('# --- BEGIN GENERATED ---');
    expect(content).toContain('# --- END GENERATED ---');
    expect(content).toContain("name: 'Flusk Analyze'");
    expect(content).toContain('script:');
    expect(content).toContain('total-cost:');
  });

  it('generates index.ts entrypoint', () => {
    const content = generateActionIndexContent(sampleSchema);
    expect(content).toContain('// --- BEGIN GENERATED ---');
    expect(content).toContain('@actions/core');
    expect(content).toContain('AnalyzeInputs');
    expect(content).toContain('AnalyzeOutputs');
    expect(content).toContain("core.getInput('script', { required: true })");
  });

  it('generates types file', () => {
    const content = generateActionTypesContent(sampleSchema);
    expect(content).toContain('AnalyzeInputs');
    expect(content).toContain('AnalyzeOutputs');
    expect(content).toContain('totalCost: string');
  });

  it('generates test file', () => {
    const content = generateActionTestContent(sampleSchema);
    expect(content).toContain('AnalyzeInputs');
    expect(content).toContain('AnalyzeOutputs');
  });
});
