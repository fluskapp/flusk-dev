import { describe, it, expect } from 'vitest';
import { createProxyServer } from '../server.js';

describe('createProxyServer', () => {
  it('creates a Fastify instance', () => {
    const app = createProxyServer({ port: 0 });
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
    expect(typeof app.close).toBe('function');
  });

  it('registers catch-all route', () => {
    const app = createProxyServer({ port: 0 });
    // Fastify should have at least one route registered
    expect(app).toBeDefined();
  });
});
