/**
 * Creates and configures the OpenTelemetry NodeSDK for Flusk
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import type { FluskOtelConfig } from './config.js';

export function createSdk(config: FluskOtelConfig): NodeSDK {
  const traceExporter = new OTLPTraceExporter({
    url: `${config.endpoint}/v1/traces`,
    headers: { 'x-flusk-api-key': config.apiKey },
  });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.projectName,
    'flusk.project.name': config.projectName,
  });

  const instrumentations = [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-openai': {
        captureContent: config.captureContent,
      },
      '@opentelemetry/instrumentation-undici': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
    }),
  ];

  return new NodeSDK({ traceExporter, resource, instrumentations });
}
