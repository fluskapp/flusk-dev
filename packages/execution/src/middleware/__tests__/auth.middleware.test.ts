import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

vi.mock('@flusk/logger', () => ({
  getLogger: () => ({ child: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) }),
}));

const API_KEY = 'org123_sk-test-key-value';
let app: FastifyInstance;

beforeAll(async () => {
  // Set env before dynamic import so module-level const captures them
  process.env.HMAC_SECRET = 'test-hmac-secret';
  process.env.FLUSK_API_KEY = API_KEY;

  const { authMiddleware } = await import('../auth.middleware.js');

  app = Fastify({ logger: false });
  app.addHook('onRequest', authMiddleware);
  app.get('/protected', async (req) => ({ orgId: req.organizationId }));
  await app.ready();
});

afterAll(() => {
  delete process.env.HMAC_SECRET;
  delete process.env.FLUSK_API_KEY;
  return app.close();
});

describe('authMiddleware', () => {
  it('rejects missing Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid scheme', async () => {
    const res = await app.inject({
      method: 'GET', url: '/protected',
      headers: { authorization: 'Basic abc123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid API key', async () => {
    const res = await app.inject({
      method: 'GET', url: '/protected',
      headers: { authorization: 'Bearer wrong-key' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts valid API key and extracts org ID', async () => {
    const res = await app.inject({
      method: 'GET', url: '/protected',
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBe('org123');
  });
});
