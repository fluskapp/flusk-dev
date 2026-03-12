import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('AI Explain Flow', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Seed calls with clear optimization opportunities:
    // Many duplicate prompts with same hash but high cost
    for (let i = 0; i < 20; i++) {
      await ctx.app.inject({
        method: 'POST',
        url: '/api/llm-calls',
        payload: {
          id: randomUUID(),
          trace_id: randomUUID(),
          span_id: randomUUID(),
          model: 'gpt-4',
          provider: 'openai',
          prompt_hash: 'duplicate-expensive-hash',
          prompt_tokens: 5000,
          completion_tokens: 2000,
          total_tokens: 7000,
          cost_usd: 0.25,
          duration_ms: 3000,
          agent_name: 'wasteful-agent',
          prompt_category: 'analysis',
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

  it('should detect patterns from duplicate prompts', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/patterns',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should have analyze sessions endpoint', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/analyze-sessions',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should create an insight record for optimization', async () => {
    const insightId = randomUUID();
    ctx.db.prepare(`
      INSERT INTO insights (id, insight_type, title, description, estimated_savings_usd, estimated_savings_percent, priority, status, affected_model, affected_agent, analyze_session_id, evidence)
      VALUES (?, 'caching', 'Enable prompt caching for wasteful-agent', 'Agent wasteful-agent sends identical prompts 20 times. Caching could save $4.75/day.', 4.75, 95, 'high', 'new', 'gpt-4', 'wasteful-agent', '', '{"duplicate_count": 20, "unique_hash": "duplicate-expensive-hash"}')
    `).run(insightId);

    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/insights/${insightId}`,
    });
    expect(res.statusCode).toBe(200);
    const insight = res.json();
    expect(insight.insight_type).toBe('caching');
    expect(insight.estimated_savings_usd).toBe(4.75);
    expect(insight.priority).toBe('high');
    expect(insight.affected_agent).toBe('wasteful-agent');
  });

  it('should list all insights', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/insights',
    });
    expect(res.statusCode).toBe(200);
    const insights = res.json();
    expect(insights.length).toBeGreaterThanOrEqual(1);
  });

  it('should update insight status to acknowledged', async () => {
    // Get first insight
    const listRes = await ctx.app.inject({
      method: 'GET',
      url: '/api/insights',
    });
    const insights = listRes.json();
    const insightId = insights[0].id;

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/insights/${insightId}/status`,
      payload: {
        status: 'acknowledged',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should verify LLM calls show the expensive pattern', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls',
    });
    const calls = res.json();
    const expensiveCalls = calls.filter(
      (c: Record<string, string>) => c.prompt_hash === 'duplicate-expensive-hash'
    );
    expect(expensiveCalls.length).toBe(20);

    const totalWaste = expensiveCalls.reduce(
      (sum: number, c: Record<string, number>) => sum + c.cost_usd, 0
    );
    expect(totalWaste).toBe(5.0);
  });
});
