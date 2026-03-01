import { describe, it, expect } from 'vitest';
import { detectTemplates } from './detect.js';

describe('detectTemplates', () => {
  it('returns empty for no calls', () => {
    expect(detectTemplates([])).toEqual([]);
  });

  it('groups repeated prompts with same prefix', () => {
    const calls = Array.from({ length: 5 }, () => ({
      prompt: 'Translate the following text to French: Hello world this is a test prompt',
      model: 'gpt-4o',
    }));
    const templates = detectTemplates(calls);
    expect(templates.length).toBe(1);
    expect(templates[0].callCount).toBe(5);
  });

  it('extracts {{var}} template variables', () => {
    const calls = Array.from({ length: 4 }, () => ({
      prompt: 'Summarize {{document}} for {{audience}} please',
      model: 'gpt-4o',
    }));
    const templates = detectTemplates(calls);
    expect(templates.length).toBe(1);
    expect(templates[0].variables).toContain('document');
    expect(templates[0].variables).toContain('audience');
  });

  it('ignores prompts below min prefix length', () => {
    const calls = Array.from({ length: 5 }, () => ({
      prompt: 'Hi',
      model: 'gpt-4o',
    }));
    expect(detectTemplates(calls)).toEqual([]);
  });

  it('requires minimum calls for template detection', () => {
    const calls = [
      { prompt: 'A unique long prompt that only appears once in the dataset', model: 'gpt-4o' },
      { prompt: 'Another unique long prompt that appears just once here', model: 'gpt-4o' },
    ];
    expect(detectTemplates(calls)).toEqual([]);
  });

  it('tracks multiple models per template', () => {
    const base = 'Generate a summary of the following document content';
    const calls = [
      { prompt: base, model: 'gpt-4o' },
      { prompt: base, model: 'claude-3-sonnet' },
      { prompt: base, model: 'gpt-4o' },
    ];
    const templates = detectTemplates(calls);
    expect(templates.length).toBe(1);
    expect(templates[0].models).toContain('gpt-4o');
    expect(templates[0].models).toContain('claude-3-sonnet');
  });
});
