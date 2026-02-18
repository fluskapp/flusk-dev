/**
 * Unit tests for command generator
 */
import { describe, it, expect } from 'vitest';
import {
  generateCommandContent,
  generateCommandOptionsContent,
  generateCommandTestContent,
  generateCommandPythonContent,
  type CommandSchema,
} from '../command.generator.js';

const sampleSchema: CommandSchema = {
  name: 'explain',
  description: 'Explain LLM cost insights',
  options: [
    { name: 'provider', type: 'string', default: 'openai', enum: ['openai', 'anthropic'], description: 'LLM provider' },
    { name: 'model', type: 'string', required: false, description: 'Model name' },
    { name: 'max-insights', type: 'integer', default: 10, description: 'Max insights' },
    { name: 'no-code', type: 'boolean', default: false, description: 'No code' },
  ],
};

describe('Command Generator', () => {
  it('generates command handler with GENERATED markers', () => {
    const content = generateCommandContent(sampleSchema);
    expect(content).toContain('// --- BEGIN GENERATED ---');
    expect(content).toContain('// --- END GENERATED ---');
    expect(content).toContain("new Command('explain')");
    expect(content).toContain('ExplainOptions');
  });

  it('generates options interface', () => {
    const content = generateCommandOptionsContent(sampleSchema);
    expect(content).toContain('ExplainOptions');
    expect(content).toContain("'openai' | 'anthropic'");
    expect(content).toContain('model?:');
    expect(content).toContain('maxInsights: number');
  });

  it('generates test file', () => {
    const content = generateCommandTestContent(sampleSchema);
    expect(content).toContain('explainCommand');
    expect(content).toContain("name()).toBe('explain')");
  });

  it('generates Python click command', () => {
    const content = generateCommandPythonContent(sampleSchema);
    expect(content).toContain('# --- BEGIN GENERATED ---');
    expect(content).toContain('# --- END GENERATED ---');
    expect(content).toContain('@click.command');
    expect(content).toContain("click.Choice(['openai', 'anthropic'])");
    expect(content).toContain('is_flag=True');
  });
});
