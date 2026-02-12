import { describe, it, expect, vi } from 'vitest';

// Mock parse-llm-span before importing handler
vi.mock('./parse-llm-span.js', () => ({
  isGenAiSpan: vi.fn((span) => span.attributes?.some((a: { key: string }) => a.key.startsWith('gen_ai.'))),
  parseLlmSpan: vi.fn((span) => ({ model: 'gpt-4', spanId: span.spanId })),
}));

import { ingestTracesHandler } from './ingest-traces.js';

function makeApp() {
  const injected: Array<{ url: string; payload: unknown }> = [];
  const routes: Record<string, Function> = {};
  const app = {
    post: vi.fn((_path: string, handler: Function) => { routes['post'] = handler; }),
    inject: vi.fn(async (opts: { url: string; payload: unknown }) => { injected.push(opts); }),
  };
  return { app, injected, routes };
}

async function setup() {
  const { app, injected, routes } = makeApp();
  await ingestTracesHandler(app as any);
  const handler = routes['post']!;
  return { handler, injected, app };
}

const genAiSpan = { spanId: 's1', attributes: [{ key: 'gen_ai.system', value: { stringValue: 'openai' } }] };
const httpSpan = { spanId: 's2', attributes: [{ key: 'http.method', value: { stringValue: 'GET' } }] };

describe('ingestTracesHandler', () => {
  it('filters only GenAI spans from mixed data', async () => {
    const { handler, injected, app } = await setup();
    const body = { resourceSpans: [{ scopeSpans: [{ spans: [genAiSpan, httpSpan] }] }] };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    await handler({ body, headers: {}, log: { error: vi.fn() } }, reply);
    expect(injected).toHaveLength(1);
    expect(injected[0]!.url).toBe('/api/v1/llm-calls');
  });

  it('returns 200 with partialSuccess on empty input', async () => {
    const { handler } = await setup();
    const body = { resourceSpans: [] };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    await handler({ body, headers: {}, log: { error: vi.fn() } }, reply);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ partialSuccess: {} });
  });

  it('handles malformed spans gracefully', async () => {
    const { handler, app } = await setup();
    vi.mocked(app.inject).mockRejectedValueOnce(new Error('boom'));
    const body = { resourceSpans: [{ scopeSpans: [{ spans: [genAiSpan] }] }] };
    const logError = vi.fn();
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    await handler({ body, headers: {}, log: { error: logError } }, reply);
    expect(logError).toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
  });
});
