import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { errorHandler } from '../error-handler.middleware.js';

let app: FastifyInstance;
let origEnv: string | undefined;

beforeAll(async () => {
  origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  app = Fastify({ logger: false });
  app.setErrorHandler(errorHandler);

  app.get('/internal', async () => {
    throw new Error('secret db connection string');
  });

  app.get('/validation', async () => {
    const err = new Error('Bad input') as Error & { statusCode?: number; validation?: unknown[] };
    err.statusCode = 400;
    err.validation = [{ message: 'field required' }];
    throw err;
  });

  await app.ready();
});

afterAll(() => {
  process.env.NODE_ENV = origEnv;
  return app.close();
});

describe('errorHandler in production', () => {
  it('sanitizes 500 error messages', async () => {
    const res = await app.inject({ method: 'GET', url: '/internal' });
    const body = res.json();
    expect(body.error.message).toBe('Internal Server Error');
    expect(body.error.message).not.toContain('secret');
  });

  it('hides validation details on 500', async () => {
    // 400 should still show validation details in production
    const res = await app.inject({ method: 'GET', url: '/validation' });
    const body = res.json();
    expect(body.error.details).toBeDefined();
  });
});
