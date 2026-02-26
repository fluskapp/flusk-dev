import { describe, it, expect } from 'vitest';
import {
  buildDatasetRecord,
  formatPair,
  formatDataset,
} from './dataset-builder.function.js';

describe('buildDatasetRecord', () => {
  it('creates a dataset record with defaults', () => {
    const record = buildDatasetRecord({
      name: 'marketing-v1',
      sourceModel: 'gpt-4o',
      exportFormat: 'jsonl',
    });
    expect(record.name).toBe('marketing-v1');
    expect(record.pairCount).toBe(0);
    expect(record.status).toBe('collecting');
    expect(record.clusterSummary).toEqual({});
  });

  it('includes optional fields when provided', () => {
    const record = buildDatasetRecord({
      tenantId: 'tenant-1',
      name: 'support-v2',
      sourceModel: 'claude-sonnet-4-20250514',
      targetModel: 'mistral-7b',
      exportFormat: 'alpaca',
    });
    expect(record.tenantId).toBe('tenant-1');
    expect(record.targetModel).toBe('mistral-7b');
    expect(record.exportFormat).toBe('alpaca');
  });
});

describe('formatPair', () => {
  const pair = {
    prompt: 'What is AI?',
    completion: 'AI is artificial intelligence.',
    systemPrompt: 'Be helpful.',
  };

  it('formats as JSONL', () => {
    const line = formatPair(pair, 'jsonl');
    const parsed = JSON.parse(line);
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[1].role).toBe('user');
    expect(parsed.messages[2].role).toBe('assistant');
  });

  it('formats as Alpaca', () => {
    const line = formatPair(pair, 'alpaca');
    const parsed = JSON.parse(line);
    expect(parsed.instruction).toBe('What is AI?');
    expect(parsed.output).toBe('AI is artificial intelligence.');
  });

  it('formats as ShareGPT', () => {
    const line = formatPair(pair, 'sharegpt');
    const parsed = JSON.parse(line);
    expect(parsed.conversations).toHaveLength(3);
    expect(parsed.conversations[1].from).toBe('human');
  });
});

describe('formatDataset', () => {
  it('formats multiple pairs', () => {
    const pairs = [
      { prompt: 'Q1', completion: 'A1' },
      { prompt: 'Q2', completion: 'A2' },
    ];
    const output = formatDataset(pairs, 'jsonl');
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).messages).toBeDefined();
  });
});
