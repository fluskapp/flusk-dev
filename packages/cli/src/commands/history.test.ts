/**
 * Tests for history command output formatting
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('history command', () => {
  it('should import without errors', async () => {
    const mod = await import('./history.js');
    assert.ok(mod.historyCommand);
    assert.strictEqual(mod.historyCommand.name(), 'history');
  });

  it('should have limit option', async () => {
    const { historyCommand } = await import('./history.js');
    const limitOpt = historyCommand.options.find((o) => o.long === '--limit');
    assert.ok(limitOpt, 'should have --limit option');
  });
});
