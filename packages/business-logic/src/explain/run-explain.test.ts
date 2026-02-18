/**
 * Integration tests for run-explain
 */
import { describe, it, expect } from 'vitest';
import { formatInsights } from './format-insights.function.js';
import type { InsightEntity } from '@flusk/entities';

const mockInsight: InsightEntity = {
  id: 'test-1',
  createdAt: '2026-02-18T12:00:00Z',
  updatedAt: '2026-02-18T12:00:00Z',
  sessionId: 'session-1',
  category: 'cost-hotspot',
  severity: 'high',
  title: 'Switch to GPT-4o-mini',
  description: 'Model gpt-4 is used for simple tasks',
  currentCost: 0.12,
  projectedCost: 0.02,
  savingsPercent: 83.3,
  codeSuggestion: 'model: "gpt-4o-mini"',
  provider: 'openai',
  model: 'gpt-4',
};

describe('formatInsights', () => {
  it('formats as JSON', () => {
    const result = formatInsights([mockInsight], 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Switch to GPT-4o-mini');
  });

  it('formats as text with emoji', () => {
    const result = formatInsights([mockInsight], 'text');
    expect(result).toContain('🟠');
    expect(result).toContain('Switch to GPT-4o-mini');
    expect(result).toContain('83.3%');
  });

  it('formats as markdown table', () => {
    const result = formatInsights([mockInsight], 'markdown');
    expect(result).toContain('| 1 |');
    expect(result).toContain('high');
  });

  it('returns empty message when no insights', () => {
    expect(formatInsights([], 'text')).toContain('No optimization');
  });

  it('hides code when noCode is true', () => {
    const result = formatInsights([mockInsight], 'text', true);
    expect(result).not.toContain('gpt-4o-mini');
  });
});
