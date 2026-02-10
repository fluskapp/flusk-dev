import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '@flusk/execution';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for API routes
 * Requires Docker (postgres + redis) running: pnpm db:up && pnpm db:migrate
 */
let app: FastifyInstance;

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    'postgresql://flusk:dev_password_change_me@localhost:5432/flusk';
  process.env.REDIS_URL ??= 'redis://localhost:6379';

  app = await createApp({ logger: false, requireAuth: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Health endpoints', () => {
  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /health/ready returns ready', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ready');
  });
});

describe('POST /api/v1/llm-calls', () => {
  const validPayload = {
    provider: 'openai',
    model: 'gpt-4',
    prompt: `test-${Date.now()}-${Math.random()}`,
    tokens: { input: 100, output: 50, total: 150 },
    response: 'Test response',
  };

  it('creates an LLM call and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/llm-calls',
      payload: validPayload,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.provider).toBe('openai');
    expect(body.model).toBe('gpt-4');
    expect(body.promptHash).toHaveLength(64);
    expect(body.cost).toBeGreaterThanOrEqual(0);
    expect(body.cached).toBe(false);
    expect(body.createdAt).toBeDefined();
  });

  it('returns 400 for missing provider', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/llm-calls',
      payload: { ...validPayload, provider: undefined },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/llm-calls',
      payload: { ...validPayload, tokens: { input: -1, output: 0, total: -1 } },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/v1/llm-calls/:id', () => {
  it('returns 404 for non-existent ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/llm-calls/${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('retrieves a created call by ID', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/llm-calls',
      payload: {
        provider: 'openai',
        model: 'gpt-4o',
        prompt: `get-by-id-${Date.now()}`,
        tokens: { input: 200, output: 100, total: 300 },
        response: 'Test',
      },
    });
    const { id } = createRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/llm-calls/${id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });
});

describe('GET /api/v1/patterns', () => {
  it('returns a list with total', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/patterns',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.patterns).toBeDefined();
    expect(typeof body.total).toBe('number');
  });
});
