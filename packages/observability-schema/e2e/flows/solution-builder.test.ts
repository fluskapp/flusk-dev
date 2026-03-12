import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('Solution Builder Flow', () => {
  let ctx: TestContext;
  const profileSessionId = randomUUID();

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should create a profile session (solution template)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/profile-sessions',
      payload: {
        id: profileSessionId,
        name: 'Customer Support Bot',
        model: 'gpt-4',
        system_prompt: 'You are a helpful customer support assistant.',
        max_tokens: 2000,
        temperature: 0.7,
        status: 'active',
        config: JSON.stringify({
          template: 'support-bot',
          channels: ['slack', 'web'],
        }),
        metadata: '{}',
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should fetch the profile session', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/profile-sessions/${profileSessionId}`,
    });
    expect(res.statusCode).toBe(200);
    const session = res.json();
    expect(session.name).toBe('Customer Support Bot');
    expect(session.model).toBe('gpt-4');
  });

  it('should simulate a run by creating an LLM call', async () => {
    const callId = randomUUID();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/llm-calls',
      payload: {
        id: callId,
        trace_id: randomUUID(),
        span_id: randomUUID(),
        model: 'gpt-4',
        provider: 'openai',
        prompt_hash: 'support-prompt-001',
        prompt_tokens: 200,
        completion_tokens: 150,
        total_tokens: 350,
        cost_usd: 0.012,
        duration_ms: 650,
        agent_name: 'Customer Support Bot',
        prompt_category: 'support',
        cached: 0,
        error: '',
        metadata: JSON.stringify({ session_id: profileSessionId }),
      },
    });
    expect(res.statusCode).toBeLessThan(400);

    // Verify it was tracked
    const getRes = await ctx.app.inject({
      method: 'GET',
      url: `/api/llm-calls/${callId}`,
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().cost_usd).toBe(0.012);
  });

  it('should track multiple runs and verify metrics', async () => {
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
          prompt_hash: 'support-prompt-001',
          prompt_tokens: 180 + i * 10,
          completion_tokens: 120 + i * 15,
          total_tokens: 300 + i * 25,
          cost_usd: 0.01 + i * 0.002,
          duration_ms: 500 + i * 50,
          agent_name: 'Customer Support Bot',
          prompt_category: 'support',
          cached: 0,
          error: '',
          metadata: JSON.stringify({ session_id: profileSessionId }),
        },
      });
    }

    // Verify all calls tracked
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls',
    });
    expect(res.statusCode).toBe(200);
    const calls = res.json();
    const supportCalls = calls.filter((c: Record<string, string>) => c.agent_name === 'Customer Support Bot');
    expect(supportCalls.length).toBeGreaterThanOrEqual(6);
  });

  it('should list profile sessions', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/profile-sessions',
    });
    expect(res.statusCode).toBe(200);
    const sessions = res.json();
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });
});
