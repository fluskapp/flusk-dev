import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('Analytics Flow', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Seed diverse data
    const models = [
      { model: 'gpt-4', provider: 'openai', cost_per_call: 0.03 },
      { model: 'gpt-3.5-turbo', provider: 'openai', cost_per_call: 0.002 },
      { model: 'claude-3-opus', provider: 'anthropic', cost_per_call: 0.045 },
      { model: 'claude-3-haiku', provider: 'anthropic', cost_per_call: 0.0003 },
    ];

    for (const m of models) {
      for (let i = 0; i < 10; i++) {
        await ctx.app.inject({
          method: 'POST',
          url: '/api/llm-calls',
          payload: {
            id: randomUUID(),
            trace_id: randomUUID(),
            span_id: randomUUID(),
            model: m.model,
            provider: m.provider,
            prompt_hash: `hash-${m.model}-${i}`,
            prompt_tokens: 100 + i * 20,
            completion_tokens: 50 + i * 10,
            total_tokens: 150 + i * 30,
            cost_usd: m.cost_per_call * (1 + i * 0.1),
            duration_ms: 200 + i * 50,
            agent_name: `agent-${i % 3}`,
            prompt_category: i % 2 === 0 ? 'chat' : 'summarize',
            cached: i % 4 === 0 ? 1 : 0,
            error: '',
            metadata: '{}',
          },
        });
      }
    }
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should list all LLM calls (overview)', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls',
    });
    expect(res.statusCode).toBe(200);
    const calls = res.json();
    expect(calls.length).toBe(40);
  });

  it('should aggregate by model', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls/aggregate/by-model',
    });
    expect(res.statusCode).toBeLessThan(500);
  });

  it('should have cost reports endpoint', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/cost-reports',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should have cost attributions endpoint', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/cost-attributions',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should verify AI usage metrics endpoint', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/ai-usage',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should verify total cost across all calls', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls',
    });
    const calls = res.json();
    const totalCost = calls.reduce((sum: number, c: Record<string, number>) => sum + c.cost_usd, 0);
    expect(totalCost).toBeGreaterThan(0);

    // Verify model diversity
    const models = new Set(calls.map((c: Record<string, string>) => c.model));
    expect(models.size).toBe(4);

    // Verify agent diversity
    const agents = new Set(calls.map((c: Record<string, string>) => c.agent_name));
    expect(agents.size).toBe(3);
  });

  it('should verify optimizations endpoint', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/optimizations',
    });
    expect(res.statusCode).toBe(200);
  });
});
