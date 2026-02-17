/**
 * Tests for template-based social post generation.
 */

import { describe, it, expect } from 'vitest';
import { generateFromTemplates } from './template-generator.js';
import type { ReleaseData } from '../types.js';

const mockRelease: ReleaseData = {
  version: '1.2.3',
  date: '2026-02-17',
  headline: 'Smart model routing',
  features: ['Auto model downgrade detection', 'Budget alerts'],
  breakingChanges: [],
  fixes: ['Fixed memory leak in OTel exporter'],
  rawChangelog: '',
};

describe('generateFromTemplates', () => {
  it('generates X post within 280 chars', () => {
    const posts = generateFromTemplates(mockRelease);
    expect(posts.x.length).toBeLessThanOrEqual(280);
    expect(posts.x).toContain('1.2.3');
    expect(posts.x).toContain('#opensource');
  });

  it('generates LinkedIn post with version', () => {
    const posts = generateFromTemplates(mockRelease);
    expect(posts.linkedin).toContain('1.2.3');
    expect(posts.linkedin).toContain('Auto model downgrade');
  });

  it('generates Reddit post with technical content', () => {
    const posts = generateFromTemplates(mockRelease);
    expect(posts.reddit).toContain('1.2.3');
    expect(posts.reddit).toContain('npx @flusk/cli');
  });
});
