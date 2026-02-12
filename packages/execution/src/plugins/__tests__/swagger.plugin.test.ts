/**
 * Tests for Swagger Plugin
 */

import { describe, it, expect, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { plugin } from '../swagger.plugin.js';

describe('Swagger Plugin', () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    if (fastify) await fastify.close();
  });

  it('should register and serve /docs', async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({ method: 'GET', url: '/docs/' });
    expect(res.statusCode).toBe(200);
  });

  it('should expose openapi json', async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({
      method: 'GET',
      url: '/docs/json',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.openapi).toBeDefined();
    expect(body.info.title).toBe('Flusk API');
  });
});
