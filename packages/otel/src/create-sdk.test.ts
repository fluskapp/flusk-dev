import { describe, it, expect, vi } from 'vitest';
import type { FluskOtelConfig } from './config.js';

const { mockExporter, mockGetInstr, mockResource } = vi.hoisted(() => ({
  mockExporter: vi.fn(),
  mockGetInstr: vi.fn(() => []),
  mockResource: vi.fn(),
}));

vi.mock('@opentelemetry/sdk-node', () => {
  class NodeSDK { constructor() {} start() {} }
  return { NodeSDK };
});
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => {
  class OTLPTraceExporter { constructor(...args: unknown[]) { mockExporter(...args); } }
  return { OTLPTraceExporter };
});
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: mockGetInstr,
}));
vi.mock('@opentelemetry/resources', () => {
  class Resource { constructor(...args: unknown[]) { mockResource(...args); } }
  return { Resource };
});
vi.mock('@opentelemetry/semantic-conventions', () => ({ ATTR_SERVICE_NAME: 'service.name' }));

import { createSdk } from './create-sdk.js';

const config: FluskOtelConfig = {
  apiKey: 'sk-test',
  endpoint: 'https://otel.flusk.dev',
  projectName: 'my-app',
  captureContent: true,
};

describe('createSdk', () => {
  it('creates exporter with correct URL and api-key header', () => {
    createSdk(config);
    expect(mockExporter).toHaveBeenCalledWith({
      url: 'https://otel.flusk.dev/v1/traces',
      headers: { 'x-flusk-api-key': 'sk-test' },
    });
  });

  it('disables noisy instrumentations (fs, dns, net)', () => {
    createSdk(config);
    const opts = mockGetInstr.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts['@opentelemetry/instrumentation-fs']).toEqual({ enabled: false });
    expect(opts['@opentelemetry/instrumentation-dns']).toEqual({ enabled: false });
    expect(opts['@opentelemetry/instrumentation-net']).toEqual({ enabled: false });
  });

  it('enables OpenAI instrumentation with captureContent', () => {
    createSdk(config);
    const opts = mockGetInstr.mock.calls[0]![0] as Record<string, unknown>;
    expect(opts['@opentelemetry/instrumentation-openai']).toEqual({ captureContent: true });
  });
});
