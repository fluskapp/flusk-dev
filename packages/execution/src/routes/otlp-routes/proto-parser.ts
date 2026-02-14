/** @generated —
 * Register content-type parser for application/x-protobuf
 * Decodes OTLP protobuf trace requests
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';

export function registerProtoParser(app: FastifyInstance): void {
  app.addContentTypeParser(
    'application/x-protobuf',
    { parseAs: 'buffer' },
    async (_req: FastifyRequest, body: Buffer) => {
      const { ProtobufTraceSerializer } = await import(
        '@opentelemetry/otlp-transformer'
      );
      return ProtobufTraceSerializer.deserialize(body);
    }
  );
}
