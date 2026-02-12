import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '@flusk/execution';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for similarity endpoints
 * Requires Docker (postgres + redis) running
 * Skip with: SKIP_DB_TESTS=1 pnpm test
 */
const skipDb = !!process.env.SKIP_DB_TESTS;

let app: FastifyInstance;

beforeAll(async () => {
  if (skipDb) return;
  process.env.DATABASE_URL ??=
    'postgresql://flusk:dev_password_change_me@localhost:5432/flusk';
  process.env.REDIS_URL ??= 'redis://localhost:6379';

  app = await createApp({ logger: false, requireAuth: false });
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
});

describe.skipIf(skipDb)('POST /api/v1/similarity/similar', () => {
  it('returns 503 when OPENAI_API_KEY is not set', async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/similarity/similar',
      payload: { prompt: 'test prompt' },
    });

    expect(res.statusCode).toBe(503);

    if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  });

  it('returns 400 for empty prompt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/similarity/similar',
      payload: { prompt: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe.skipIf(skipDb)('POST /api/v1/similarity/backfill-embeddings', () => {
  it('returns 503 when OPENAI_API_KEY is not set', async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/similarity/backfill-embeddings',
      payload: {},
    });

    expect(res.statusCode).toBe(503);

    if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  });
});
