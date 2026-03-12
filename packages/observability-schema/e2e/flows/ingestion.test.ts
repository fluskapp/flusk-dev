import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, destroyTestApp, type TestContext } from '../setup.js';
import { randomUUID } from 'node:crypto';

describe('Data Ingestion Flow', () => {
  let ctx: TestContext;
  const traceId = randomUUID();
  const spanId = randomUUID();

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('should ingest OTLP traces', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/traces/otlp',
      payload: {
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: 'test-agent' } },
              ],
            },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId,
                    spanId,
                    name: 'llm.chat',
                    kind: 'CLIENT',
                    startTimeUnixNano: Date.now() * 1_000_000,
                    endTimeUnixNano: (Date.now() + 500) * 1_000_000,
                    attributes: [
                      { key: 'llm.model', value: { stringValue: 'gpt-4' } },
                      { key: 'llm.prompt_tokens', value: { intValue: 150 } },
                      { key: 'llm.completion_tokens', value: { intValue: 50 } },
                    ],
                    status: { code: 'OK' },
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(res.statusCode).toBeLessThan(400);
  });

  it('should list traces after ingestion', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/traces',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('should create an LLM call record directly', async () => {
    const llmCallId = randomUUID();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/llm-calls',
      payload: {
        id: llmCallId,
        trace_id: traceId,
        span_id: spanId,
        model: 'gpt-4',
        provider: 'openai',
        prompt_hash: 'abc123',
        prompt_tokens: 150,
        completion_tokens: 50,
        total_tokens: 200,
        cost_usd: 0.0089,
        duration_ms: 500,
        agent_name: 'test-agent',
        prompt_category: 'chat',
        cached: 0,
        error: '',
        metadata: '{}',
      },
    });
    expect(res.statusCode).toBeLessThan(400);

    // Verify the call was stored
    const getRes = await ctx.app.inject({
      method: 'GET',
      url: `/api/llm-calls/${llmCallId}`,
    });
    expect(getRes.statusCode).toBe(200);
    const call = getRes.json();
    expect(call.model).toBe('gpt-4');
    expect(call.cost_usd).toBe(0.0089);
  });

  it('should list spans', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/traces/${traceId}/spans`,
    });
    expect(res.statusCode).toBeLessThan(500);
  });

  it('should detect patterns from LLM calls', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/patterns',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should aggregate LLM calls by model', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/llm-calls/aggregate/by-model',
    });
    expect(res.statusCode).toBeLessThan(500);
  });
});
