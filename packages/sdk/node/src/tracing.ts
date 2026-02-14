/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

export interface TracingConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId: string;
}

async function post(config: TracingConfig, path: string, body: unknown): Promise<Record<string, unknown>> {
  const base = config.baseUrl || 'https://api.flusk.ai';
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Flusk API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface SpanOptions {
  type: 'llm' | 'tool' | 'retrieval' | 'chain';
  parentSpanId?: string;
  input?: string;
}

export class Span {
  public id: string | null = null;
  private config: TracingConfig;
  private traceId: string;
  private name: string;
  private options: SpanOptions;

  constructor(config: TracingConfig, traceId: string, name: string, opts: SpanOptions) {
    this.config = config;
    this.traceId = traceId;
    this.name = name;
    this.options = opts;
  }

  async start(): Promise<this> {
    const res = await post(this.config, '/api/v1/spans', {
      traceId: this.traceId, parentSpanId: this.options.parentSpanId ?? null,
      type: this.options.type, name: this.name, input: this.options.input ?? null,
    });
    this.id = res.id as string;
    return this;
  }

  async end(result?: { output?: string; cost: number; tokens: number }): Promise<void> {
    if (!this.id) throw new Error('Span not started');
    await post(this.config, `/api/v1/spans/${this.id}/complete`, {
      output: result?.output ?? null, cost: result?.cost ?? 0, tokens: result?.tokens ?? 0,
    });
  }
}

export class Trace {
  public id: string | null = null;
  private config: TracingConfig;
  private name: string;

  constructor(config: TracingConfig, name: string) {
    this.config = config;
    this.name = name;
  }

  async start(): Promise<this> {
    const res = await post(this.config, '/api/v1/traces', {
      organizationId: this.config.organizationId, name: this.name,
    });
    this.id = res.id as string;
    return this;
  }

  span(name: string, options: SpanOptions): Span {
    if (!this.id) throw new Error('Trace not started');
    return new Span(this.config, this.id, name, options);
  }

  async end(): Promise<void> {
    if (!this.id) throw new Error('Trace not started');
    await post(this.config, `/api/v1/traces/${this.id}/complete`, {});
  }
}

export function startTrace(config: TracingConfig, name: string): Trace {
  return new Trace(config, name);
}
