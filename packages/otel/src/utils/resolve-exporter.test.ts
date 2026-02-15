import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => {
  class OTLPTraceExporter { constructor(public opts: any) {} }
  return { OTLPTraceExporter };
});

vi.mock('../exporters/sqlite-exporter.js', () => {
  class SqliteSpanExporter { constructor(public dbPath?: string) {} }
  return { SqliteSpanExporter };
});

vi.mock('@flusk/logger', () => ({
  createLogger: () => ({
    info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn(),
  }),
}));

import { resolveMode, resolveExporter } from './resolve-exporter.js';
import { SqliteSpanExporter } from '../exporters/sqlite-exporter.js';

const config = {
  apiKey: 'sk-test',
  endpoint: 'https://otel.flusk.dev',
  projectName: 'test',
  captureContent: true,
  exportTargets: [],
};

describe('resolveMode', () => {
  const origEnv = { ...process.env };
  afterEach(() => { process.env = { ...origEnv }; });

  it('defaults to local when no env vars', () => {
    delete process.env.FLUSK_MODE;
    delete process.env.FLUSK_ENDPOINT;
    expect(resolveMode()).toBe('local');
  });

  it('returns server when FLUSK_MODE=server', () => {
    process.env.FLUSK_MODE = 'server';
    expect(resolveMode()).toBe('server');
  });

  it('returns server when FLUSK_ENDPOINT is set', () => {
    delete process.env.FLUSK_MODE;
    process.env.FLUSK_ENDPOINT = 'http://localhost:3000';
    expect(resolveMode()).toBe('server');
  });
});

describe('resolveExporter', () => {
  const origEnv = { ...process.env };
  afterEach(() => { process.env = { ...origEnv }; });

  it('returns SqliteSpanExporter in local mode', () => {
    process.env.FLUSK_MODE = 'local';
    delete process.env.FLUSK_ENDPOINT;
    const exporter = resolveExporter(config);
    expect(exporter).toBeInstanceOf(SqliteSpanExporter);
  });

  it('returns OTLPTraceExporter in server mode', () => {
    process.env.FLUSK_MODE = 'server';
    const exporter = resolveExporter(config);
    expect((exporter as any).opts.url).toBe('https://otel.flusk.dev/v1/traces');
  });
});
