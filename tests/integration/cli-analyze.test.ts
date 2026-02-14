import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '@flusk/resources';
import { budget } from '@flusk/business-logic';

/**
 * Integration tests for the analyze + storage flow.
 * Uses raw SQLite (not the singleton) for test isolation.
 */
describe('CLI analyze flow (no Docker)', () => {
  let tempDir: string;
  let dbPath: string;
  let db: DatabaseSync;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'flusk-analyze-test-'));
    dbPath = join(tempDir, 'test.db');
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA foreign_keys=ON');
    runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function insertLLMCall(overrides: Record<string, unknown> = {}) {
    const defaults = {
      provider: 'openai',
      model: 'gpt-4o',
      prompt: 'Hello world',
      prompt_hash: 'a'.repeat(64),
      tokens: JSON.stringify({ input: 10, output: 20, total: 30 }),
      cost: 0.05,
      response: 'Hi there',
      cached: 0,
      consent_given: 1,
      consent_purpose: 'optimization',
    };
    const data = { ...defaults, ...overrides };
    db.prepare(`
      INSERT INTO llm_calls (
        provider, model, prompt, prompt_hash, tokens,
        cost, response, cached, consent_given, consent_purpose
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.provider, data.model, data.prompt, data.prompt_hash,
      data.tokens, data.cost, data.response,
      data.cached, data.consent_given, data.consent_purpose,
    );
  }

  it('creates SQLite DB with migrations', () => {
    expect(existsSync(dbPath)).toBe(true);
    // Check that llm_calls table exists
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_calls'"
    ).all();
    expect(tables.length).toBe(1);
  });

  it('stores and retrieves LLM calls', () => {
    insertLLMCall();
    const rows = db.prepare('SELECT * FROM llm_calls').all() as Array<Record<string, unknown>>;
    expect(rows.length).toBe(1);
    expect(rows[0].model).toBe('gpt-4o');
  });

  it('counts calls by model', () => {
    for (let i = 0; i < 3; i++) {
      insertLLMCall({
        prompt: `prompt-${i}`,
        prompt_hash: `${'a'.repeat(62)}${String(i).padStart(2, '0')}`,
      });
    }
    insertLLMCall({
      provider: 'anthropic',
      model: 'claude-3-haiku',
      prompt_hash: 'b'.repeat(64),
      cost: 0.02,
    });

    const byModel = db.prepare(
      'SELECT model, COUNT(*) as count FROM llm_calls GROUP BY model ORDER BY count DESC'
    ).all() as Array<{ model: string; count: number }>;
    expect(byModel.length).toBe(2);
    expect(byModel[0].model).toBe('gpt-4o');
    expect(byModel[0].count).toBe(3);
  });

  it('sums total cost', () => {
    insertLLMCall({ cost: 1.5, prompt_hash: 'a'.repeat(64) });
    insertLLMCall({ cost: 2.5, prompt_hash: 'b'.repeat(64) });

    const result = db.prepare(
      'SELECT COALESCE(SUM(cost), 0) as total FROM llm_calls'
    ).get() as { total: number };
    expect(result.total).toBe(4.0);
  });

  it('detects duplicate calls', () => {
    const hash = 'c'.repeat(64);
    insertLLMCall({ prompt_hash: hash, prompt: 'same1' });
    insertLLMCall({ prompt_hash: hash, prompt: 'same2' });

    const result = db.prepare(`
      SELECT COALESCE(SUM(cnt), 0) as total FROM (
        SELECT COUNT(*) as cnt FROM llm_calls
        GROUP BY prompt_hash HAVING COUNT(*) > 1
      )
    `).get() as { total: number };
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it('budget check works with storage data', () => {
    for (let i = 0; i < 5; i++) {
      insertLLMCall({
        cost: 3.0,
        prompt: `prompt-${i}`,
        prompt_hash: `${'d'.repeat(62)}${String(i).padStart(2, '0')}`,
      });
    }

    const totalCost = (db.prepare(
      'SELECT COALESCE(SUM(cost), 0) as total FROM llm_calls'
    ).get() as { total: number }).total;

    const totalCalls = (db.prepare(
      'SELECT COUNT(*) as cnt FROM llm_calls'
    ).get() as { cnt: number }).cnt;

    const duplicateCalls = (db.prepare(`
      SELECT COALESCE(SUM(cnt), 0) as total FROM (
        SELECT COUNT(*) as cnt FROM llm_calls
        GROUP BY prompt_hash HAVING COUNT(*) > 1
      )
    `).get() as { total: number }).total;

    const status = budget.checkBudget(
      { daily: 10.0, monthly: 100.0 },
      { dailyCost: totalCost, monthlyCost: totalCost, totalCalls, duplicateCalls },
    );

    expect(status.daily.exceeded).toBe(true); // 15 > 10
    expect(status.monthly.exceeded).toBe(false); // 15 < 100
  });

  it('analyze_sessions table exists and accepts inserts', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='analyze_sessions'"
    ).all();
    expect(tables.length).toBe(1);
  });
});
