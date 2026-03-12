import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('Cost Tracking Flow', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should ingest multiple LLM calls with different models and costs', async () => {
    const calls = [
      { model: 'gpt-4', provider: 'openai', cost_usd: 3.5, prompt_tokens: 5000, completion_tokens: 1500 },
      { model: 'gpt-3.5-turbo', provider: 'openai', cost_usd: 0.5, prompt_tokens: 3000, completion_tokens: 1000 },
      { model: 'claude-3-opus', provider: 'anthropic', cost_usd: 4.2, prompt_tokens: 4000, completion_tokens: 2000 },
    ];

    for (const call of calls) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/llm-calls',
        payload: {
          id: randomUUID(),
          trace_id: randomUUID(),
          span_id: randomUUID(),
          model: call.model,
          provider: call.provider,
          prompt_hash: `hash-${call.model}`,
          prompt_tokens: call.prompt_tokens,
          completion_tokens: call.completion_tokens,
          total_tokens: call.prompt_tokens + call.completion_tokens,
          cost_usd: call.cost_usd,
          duration_ms: 800,
          agent_name: 'cost-test-agent',
          prompt_category: 'chat',
          cached: 0,
          error: '',
          metadata: '{}',
        },
      });
      expect(res.statusCode).toBeLessThan(400);
    }
  });

  it('should create a cost budget with $10 limit', async () => {
    const budgetId = randomUUID();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/cost-budgets',
      payload: {
        id: budgetId,
        tag_key: 'agent',
        tag_value: 'cost-test-agent',
        limit_usd: 10,
        period: 'monthly',
        alert_at: 80,
        action: 'alert',
        enabled: 1,
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should create a budget alert', async () => {
    const alertId = randomUUID();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/budget-alerts',
      payload: {
        id: alertId,
        name: '$10 Budget Alert',
        budget_type: 'monthly',
        threshold_usd: 10,
        warning_percent: 80,
        current_spend_usd: 8.2,
        enabled: 1,
        auto_pause: 0,
        last_triggered_at: '',
        agent_filter: JSON.stringify({ agent: 'cost-test-agent' }),
      },
    });
    expect(res.statusCode).toBeLessThan(400);

    // Verify the alert exists
    const getRes = await ctx.app.inject({
      method: 'GET',
      url: `/api/budget-alerts/${alertId}`,
    });
    expect(getRes.statusCode).toBe(200);
    const alert = getRes.json();
    expect(alert.threshold_usd).toBe(10);
    expect(alert.current_spend_usd).toBe(8.2);
  });

  it('should ingest another call that pushes spend over budget', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/llm-calls',
      payload: {
        id: randomUUID(),
        trace_id: randomUUID(),
        span_id: randomUUID(),
        model: 'gpt-4',
        provider: 'openai',
        prompt_hash: 'hash-overbudget',
        prompt_tokens: 8000,
        completion_tokens: 3000,
        total_tokens: 11000,
        cost_usd: 5.0,
        duration_ms: 1200,
        agent_name: 'cost-test-agent',
        prompt_category: 'chat',
        cached: 0,
        error: '',
        metadata: '{}',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should create an alert event for budget exceeded', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/alert-events',
      payload: {
        id: randomUUID(),
        alert_type: 'budget_exceeded',
        severity: 'critical',
        title: 'Budget exceeded: cost-test-agent',
        message: 'Monthly budget of $10 exceeded. Current spend: $13.20',
        channel_name: 'slack-alerts',
        delivered: 0,
        acknowledged_at: '',
        metadata: JSON.stringify({ budget_id: 'test', current_spend: 13.2, limit: 10 }),
      },
    });
    expect(res.statusCode).toBeLessThan(400);

    // Verify alert event created
    const listRes = await ctx.app.inject({
      method: 'GET',
      url: '/api/alert-events',
    });
    expect(listRes.statusCode).toBe(200);
    const events = listRes.json();
    const budgetEvent = events.find((e: Record<string, unknown>) => e.alert_type === 'budget_exceeded');
    expect(budgetEvent).toBeDefined();
    expect(budgetEvent.severity).toBe('critical');
  });

  it('should list all LLM calls for cost analysis', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls',
    });
    expect(res.statusCode).toBe(200);
    const calls = res.json();
    expect(calls.length).toBeGreaterThanOrEqual(4);

    const totalCost = calls.reduce((sum: number, c: Record<string, number>) => sum + c.cost_usd, 0);
    expect(totalCost).toBeGreaterThan(10);
  });
});
