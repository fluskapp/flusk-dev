/**
 * Creates and configures the OpenTelemetry NodeSDK for Flusk.
 * Auto-detects local vs server mode for exporter selection.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BedrockInstrumentation } from '@traceloop/instrumentation-bedrock';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { FluskOtelConfig } from './config.js';
import { resolveExporter } from './utils/resolve-exporter.js';

export interface CreateSdkOptions {
  spanProcessors?: SpanProcessor[];
}

export function createSdk(config: FluskOtelConfig, opts?: CreateSdkOptions): NodeSDK {
  const traceExporter = resolveExporter(config);

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.projectName,
    'flusk.project.name': config.projectName,
  });

  const instrumentations = [
    new BedrockInstrumentation(),
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

  return new NodeSDK({
    traceExporter,
    resource,
    instrumentations,
    spanProcessors: opts?.spanProcessors,
  });
}
