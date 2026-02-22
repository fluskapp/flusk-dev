import { describe, it, expect } from 'vitest';
import { detectTemplate } from './detect-template.function.js';

describe('detectTemplate', () => {
  it('detects placeholders in prompt', () => {
    const result = detectTemplate({
      prompt: 'You are a {role}. Answer about {topic}.',
    });
    expect(result.isTemplate).toBe(true);
    expect(result.variables).toEqual(['role', 'topic']);
    expect(result.templateTag).toBe('system-prompt:role,topic');
  });

  it('detects system prompt prefix without placeholders', () => {
    const result = detectTemplate({
      prompt: 'You are a helpful assistant.',
    });
    expect(result.isTemplate).toBe(true);
    expect(result.templateTag).toBe('system-prompt:static');
  });

  it('returns false for plain prompts', () => {
    const result = detectTemplate({ prompt: 'What is 2+2?' });
    expect(result.isTemplate).toBe(false);
    expect(result.templateTag).toBeNull();
  });

  it('deduplicates variable names', () => {
    const result = detectTemplate({
      prompt: '{name} said hello to {name}',
    });
    expect(result.variables).toEqual(['name']);
  });
});
