import { describe, it, expect, vi } from 'vitest';
import type { FluskOtelConfig } from './config.js';

const { mockGetInstr, mockResource, mockResolveExporter } = vi.hoisted(() => ({
  mockGetInstr: vi.fn(() => []),
  mockResource: vi.fn(),
  mockResolveExporter: vi.fn(() => ({ url: 'mock' })),
}));

vi.mock('@opentelemetry/sdk-node', () => {
  class NodeSDK { constructor() {} start() {} }
  return { NodeSDK };
});
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: mockGetInstr,
}));
vi.mock('@opentelemetry/resources', () => {
  class Resource { constructor(...args: unknown[]) { mockResource(...args); } }
  return { Resource };
});
vi.mock('@opentelemetry/semantic-conventions', () => ({ ATTR_SERVICE_NAME: 'service.name' }));
vi.mock('./utils/resolve-exporter.js', () => ({
  resolveExporter: mockResolveExporter,
}));

import { createSdk } from './create-sdk.js';

const config: FluskOtelConfig = {
  apiKey: 'sk-test',
  endpoint: 'https://otel.flusk.dev',
  projectName: 'my-app',
  captureContent: true,
};

describe('createSdk', () => {
  it('calls resolveExporter with config', () => {
    createSdk(config);
    expect(mockResolveExporter).toHaveBeenCalledWith(config);
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
