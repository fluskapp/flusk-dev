/**
 * OTLP ingestion routes — receives OpenTelemetry traces
 * Includes protobuf parser, rate limiting, and WebSocket live feed
 */
import type { FastifyInstance } from 'fastify';
import { ingestTracesHandler } from './ingest-traces.js';
import { registerProtoParser } from './proto-parser.js';
import { liveFeedRoute } from './live-feed.js';

export async function otlpRoutes(app: FastifyInstance): Promise<void> {
  registerProtoParser(app);

  await app.register(import('@fastify/rate-limit'), {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) =>
      (request.headers['x-flusk-api-key'] as string) || request.ip,
  });

  await app.register(ingestTracesHandler);
  await app.register(liveFeedRoute);
}
