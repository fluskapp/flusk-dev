import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('Drift Detection Flow', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Seed baseline LLM calls
    for (let i = 0; i < 5; i++) {
      await ctx.app.inject({
        method: 'POST',
        url: '/api/llm-calls',
        payload: {
          id: randomUUID(),
          trace_id: randomUUID(),
          span_id: randomUUID(),
          model: 'gpt-4',
          provider: 'openai',
          prompt_hash: 'baseline-hash-001',
          prompt_tokens: 100 + i * 10,
          completion_tokens: 50 + i * 5,
          total_tokens: 150 + i * 15,
          cost_usd: 0.005 + i * 0.001,
          duration_ms: 300 + i * 20,
          agent_name: 'drift-agent',
          prompt_category: 'summarize',
          cached: 0,
          error: '',
          metadata: '{}',
        },
      });
    }
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should ingest calls with different behavior (potential drift)', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/llm-calls',
        payload: {
          id: randomUUID(),
          trace_id: randomUUID(),
          span_id: randomUUID(),
          model: 'gpt-4',
          provider: 'openai',
          prompt_hash: 'drifted-hash-002',
          prompt_tokens: 500 + i * 50,
          completion_tokens: 200 + i * 30,
          total_tokens: 700 + i * 80,
          cost_usd: 0.025 + i * 0.005,
          duration_ms: 800 + i * 100,
          agent_name: 'drift-agent',
          prompt_category: 'summarize',
          cached: 0,
          error: '',
          metadata: '{}',
        },
      });
      expect(res.statusCode).toBeLessThan(400);
    }
  });

  it('should trigger a drift scan', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/drift-detections/scan',
      payload: {
        agent_label: 'drift-agent',
        baseline_period: '2026-02-01/2026-02-28',
        current_period: '2026-03-01/2026-03-02',
      },
    });
    expect(res.statusCode).toBeLessThan(500);
  });

  it('should list drift detections', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/drift-detections',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('should create a drift detection record directly and verify', async () => {
    const driftId = randomUUID();
    // Insert directly via DB for testing
    ctx.db.prepare(`
      INSERT INTO drift_detections (id, agent_label, detection_type, severity, baseline_hash, current_hash, drift_score, sample_count, baseline_period, current_period, details, status)
      VALUES (?, 'drift-agent', 'prompt', 'warning', 'baseline-hash-001', 'drifted-hash-002', 0.78, 10, '2026-02-01/2026-02-28', '2026-03-01/2026-03-02', '{"tokens_increase": "4x", "cost_increase": "5x"}', 'active')
    `).run(driftId);

    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/drift-detections/${driftId}`,
    });
    expect(res.statusCode).toBe(200);
    const drift = res.json();
    expect(drift.agent_label).toBe('drift-agent');
    expect(drift.drift_score).toBe(0.78);
    expect(drift.severity).toBe('warning');
  });

  it('should create an alert for detected drift', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/alert-events',
      payload: {
        id: randomUUID(),
        alert_type: 'drift_detected',
        severity: 'warning',
        title: 'Prompt drift detected: drift-agent',
        message: 'Agent drift-agent shows 78% prompt drift. Token usage increased 4x.',
        channel_name: 'slack-alerts',
        delivered: 0,
        acknowledged_at: '',
        metadata: JSON.stringify({ agent: 'drift-agent', drift_score: 0.78 }),
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });
});
