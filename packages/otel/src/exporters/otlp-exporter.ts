/**
 * Generic OTLP exporter with platform presets
 * Supports: Grafana Tempo, Datadog, New Relic
 */
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { createLogger } from '@flusk/logger';

const log = createLogger({ name: 'otlp-exporter' });

export type OtlpPlatform = 'grafana' | 'datadog' | 'newrelic' | 'custom';

export interface OtlpExporterConfig {
  platform: OtlpPlatform;
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

const PLATFORM_DEFAULTS: Record<OtlpPlatform, { endpoint: string; authHeader: string }> = {
  grafana: {
    endpoint: 'https://tempo-us-central1.grafana.net/tempo',
    authHeader: 'Authorization',
  },
  datadog: {
    endpoint: 'https://trace.agent.datadoghq.com/api/v0.2/traces',
    authHeader: 'DD-API-KEY',
  },
  newrelic: {
    endpoint: 'https://otlp.nr-data.net:4318/v1/traces',
    authHeader: 'Api-Key',
  },
  custom: {
    endpoint: 'http://localhost:4318/v1/traces',
    authHeader: 'Authorization',
  },
};

export function createOtlpExporter(config: OtlpExporterConfig): SpanExporter {
  const defaults = PLATFORM_DEFAULTS[config.platform];
  const endpoint = config.endpoint || defaults.endpoint;

  const headers: Record<string, string> = { ...config.headers };
  if (config.apiKey) {
    if (config.platform === 'grafana') {
      headers[defaults.authHeader] = `Basic ${Buffer.from(config.apiKey).toString('base64')}`;
    } else {
      headers[defaults.authHeader] = config.apiKey;
    }
  }

  log.info(`OTLP exporter: ${config.platform} → ${endpoint}`);
  return new OTLPTraceExporter({ url: endpoint, headers }) as unknown as SpanExporter;
}
