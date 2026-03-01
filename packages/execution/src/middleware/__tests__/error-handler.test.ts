import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { errorHandler } from '../error-handler.middleware.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  app.setErrorHandler(errorHandler);

  app.get('/not-found', async () => {
    const err = new Error('Not found') as Error & { statusCode?: number; validation?: unknown[] };
    err.statusCode = 404;
    throw err;
  });

  app.get('/validation', async () => {
    const err = new Error('Validation failed') as Error & { statusCode?: number; validation?: unknown[] };
    err.statusCode = 400;
    err.validation = [{ message: 'field required' }];
    throw err;
  });

  app.get('/internal', async () => {
    throw new Error('Unexpected crash');
  });

  app.get('/conflict', async () => {
    const err = new Error('Duplicate') as Error & { statusCode?: number; validation?: unknown[] };
    err.statusCode = 409;
    throw err;
  });

  app.get('/forbidden', async () => {
    const err = new Error('Forbidden') as Error & { statusCode?: number; validation?: unknown[] };
    err.statusCode = 403;
    throw err;
  });

  await app.ready();
});

afterAll(() => app.close());

describe('errorHandler middleware', () => {
  it('returns 404 with NOT_FOUND code', async () => {
    const res = await app.inject({ method: 'GET', url: '/not-found' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 with VALIDATION_ERROR and details', async () => {
    const res = await app.inject({ method: 'GET', url: '/validation' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined();
  });

  it('returns 500 with INTERNAL_SERVER_ERROR', async () => {
    const res = await app.inject({ method: 'GET', url: '/internal' });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('returns 409 with CONFLICT code', async () => {
    const res = await app.inject({ method: 'GET', url: '/conflict' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CONFLICT');
  });

  it('returns 403 with FORBIDDEN code', async () => {
    const res = await app.inject({ method: 'GET', url: '/forbidden' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });
});
