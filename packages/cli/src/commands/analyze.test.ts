// --- BEGIN CUSTOM ---
import { describe, it, expect } from 'vitest';
import { analyzeCommand } from './analyze.js';

describe('analyze command', () => {
  it('has correct name and description', () => {
    expect(analyzeCommand.name()).toBe('analyze');
    expect(analyzeCommand.description()).toContain('Analyze');
  });

  it('requires a script argument', () => {
    const args = analyzeCommand.registeredArguments;
    expect(args.length).toBe(1);
    expect(args[0].required).toBe(true);
  });

  it('has duration option with default 60', () => {
    const opt = analyzeCommand.options.find((o) => o.long === '--duration');
    expect(opt).toBeDefined();
    expect(opt!.defaultValue).toBe('60');
  });

  it('has format option with default markdown', () => {
    const opt = analyzeCommand.options.find((o) => o.long === '--format');
    expect(opt).toBeDefined();
    expect(opt!.defaultValue).toBe('markdown');
  });

  it('has mode option with default local', () => {
    const opt = analyzeCommand.options.find((o) => o.long === '--mode');
    expect(opt).toBeDefined();
    expect(opt!.defaultValue).toBe('local');
  });

  it('has output option', () => {
    const opt = analyzeCommand.options.find((o) => o.long === '--output');
    expect(opt).toBeDefined();
  });

  it('has redact flag', () => {
    const opt = analyzeCommand.options.find((o) => o.long === '--redact');
    expect(opt).toBeDefined();
  });

  it('has agent option', () => {
    const opt = analyzeCommand.options.find((o) => o.long === '--agent');
    expect(opt).toBeDefined();
  });
});
// --- END CUSTOM ---
