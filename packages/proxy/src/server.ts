/**
 * Fastify proxy server — forwards LLM API calls and captures them.
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { createLogger } from '@flusk/logger';
import { detectProvider } from './providers/detect.js';
import { resolveUpstream } from './upstream.js';
import { handleProxy } from './proxy-handler.js';
import { SmartRouter } from './router.js';
import type { RouterConfig } from './router-config.js';

const log = createLogger({ name: 'proxy-server' });

export interface ProxyOptions {
  port: number;
  upstream?: string;
  cache?: boolean;
  routerConfig?: Partial<RouterConfig>;
}

/** Create and configure the proxy Fastify server. */
export function createProxyServer(opts: ProxyOptions): FastifyInstance {
  const app = Fastify({
    logger: false,
    bodyLimit: 10 * 1024 * 1024,
  });

  // Raw body capture — needed before JSON parse for forwarding
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  const router = opts.routerConfig
    ? new SmartRouter(opts.routerConfig) : undefined;

  app.all('/*', async (request, reply) => {
    const path = request.url;
    const headers = request.headers as Record<string, string | undefined>;
    const info = detectProvider(path, headers);
    const upstream = resolveUpstream(info.provider, opts.upstream);

    if (!upstream) {
      return reply.status(502).send({ error: 'Unknown provider' });
    }

    return handleProxy({
      request, reply, upstream, path, info, headers, router,
    });
  });

  app.addHook('onReady', () => {
    log.info({ port: opts.port }, 'Proxy server ready');
  });

  return app;
}

/** Start the proxy server. */
export async function startProxy(opts: ProxyOptions): Promise<FastifyInstance> {
  const app = createProxyServer(opts);
  await app.listen({ port: opts.port, host: '0.0.0.0' });
  log.info({ port: opts.port }, 'Proxy listening');
  return app;
}
