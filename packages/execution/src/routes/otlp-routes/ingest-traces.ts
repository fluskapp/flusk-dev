/**
 * POST /v1/traces — OTLP trace ingestion handler
 * Receives OTel traces, extracts GenAI spans, maps to Flusk LLM call entities
 */
import type { FastifyInstance } from 'fastify';
import type { OtlpTraceRequest } from './types.js';
import { isGenAiSpan, parseLlmSpan } from './parse-llm-span.js';

export async function ingestTracesHandler(app: FastifyInstance): Promise<void> {
  app.post<{ Body: OtlpTraceRequest }>('/traces', async (request, reply) => {
    const { resourceSpans } = request.body;
    const llmCalls = [];

    for (const rs of resourceSpans) {
      for (const ss of rs.scopeSpans) {
        for (const span of ss.spans) {
          if (isGenAiSpan(span)) {
            llmCalls.push(parseLlmSpan(span));
          }
        }
      }
    }

    // Forward parsed LLM calls to existing llm-calls endpoint logic
    for (const call of llmCalls) {
      try {
        await app.inject({
          method: 'POST',
          url: '/api/v1/llm-calls',
          payload: call,
          headers: request.headers,
        });
      } catch (err) {
        request.log.error({ err, call }, 'Failed to ingest OTel LLM call');
      }
    }

    return reply.status(200).send({ partialSuccess: {} });
  });
}
