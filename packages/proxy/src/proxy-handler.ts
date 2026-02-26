/**
 * Handle proxied requests — forward to upstream and capture response.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ProviderInfo } from './providers/detect.js';
import { interceptResponse } from './interceptor.js';
import { parseSSEChunks } from './stream-collector.js';
import type { SmartRouter } from './router.js';

interface HandlerOpts {
  request: FastifyRequest;
  reply: FastifyReply;
  upstream: string;
  path: string;
  info: ProviderInfo;
  headers: Record<string, string | undefined>;
  router?: SmartRouter;
}

/** Forward request to upstream, stream or buffer response, then capture. */
export async function handleProxy(opts: HandlerOpts): Promise<void> {
  const { request, reply, upstream, path, headers, router } = opts;
  const decision = router?.route();
  const targetUrl = decision ? decision.target.endpoint : upstream;
  const startMs = Date.now();
  const url = `${targetUrl}${path}`;
  const body = JSON.stringify(request.body);
  const isStream = (request.body as Record<string, unknown>)?.stream === true;

  const fwdHeaders: Record<string, string> = { 'content-type': 'application/json' };
  for (const key of ['authorization', 'x-api-key', 'anthropic-version']) {
    if (headers[key]) fwdHeaders[key] = headers[key]!;
  }

  const response = await fetch(url, { method: 'POST', headers: fwdHeaders, body });

  const latencyMs = Date.now() - startMs;

  if (isStream && response.body) {
    return handleStream(opts, response, latencyMs);
  }

  const responseBody = await response.json() as unknown;
  reply.status(response.status).send(responseBody);

  if (decision && router) {
    const ok = response.status >= 200 && response.status < 400;
    router.reportOutcome(decision.target, latencyMs, ok, response.status);
  }

  interceptResponse({
    path, headers, requestBody: request.body,
    responseBody, statusCode: response.status, latencyMs,
  });
}

async function handleStream(
  opts: HandlerOpts,
  response: Response,
  _startLatencyMs: number,
): Promise<void> {
  const { reply, path, headers, request } = opts;
  const startMs = Date.now() - _startLatencyMs;

  reply.raw.writeHead(response.status, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });

  const chunks: string[] = [];
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  try {
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        const text = decoder.decode(result.value, { stream: !done });
        chunks.push(text);
        reply.raw.write(result.value);
      }
    }
  } finally {
    reply.raw.end();
  }

  const latencyMs = Date.now() - startMs;
  const parsed = parseSSEChunks(chunks);
  interceptResponse({
    path, headers, requestBody: request.body,
    responseBody: { model: parsed.model, usage: parsed.tokens },
    statusCode: response.status, latencyMs,
  });
}
