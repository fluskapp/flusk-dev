/**
 * Span processor that strips sensitive attributes (API keys, auth headers)
 * before export. Prevents user LLM API keys from leaking into telemetry.
 */
import type { SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';

const SENSITIVE_PREFIXES = [
  'http.request.header.authorization',
  'http.request.header.x-api-key',
  'http.request.header.x-flusk-api-key',
  'http.request.header.api-key',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_PREFIXES.some((p) => lower.startsWith(p));
}

export class SanitizeSpanProcessor implements SpanProcessor {
  onStart(_span: Span, _context: Context): void {
    /* no-op */
  }

  onEnd(span: ReadableSpan): void {
    const attrs = span.attributes;
    for (const key of Object.keys(attrs)) {
      if (isSensitiveKey(key)) {
        // ReadableSpan attributes are mutable in practice
        (attrs as Record<string, unknown>)[key] = '[REDACTED]';
      }
    }
  }

  async shutdown(): Promise<void> {
    /* no-op */
  }

  async forceFlush(): Promise<void> {
    /* no-op */
  }
}
