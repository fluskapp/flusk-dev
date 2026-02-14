/** @generated —
 * OTLP trace ingestion types — GenAI semantic convention attributes
 */
export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
  status?: { code: number; message?: string };
}

export interface OtlpAttribute {
  key: string;
  value: { stringValue?: string; intValue?: string; doubleValue?: number; boolValue?: boolean };
}

export interface OtlpTraceRequest {
  resourceSpans: Array<{
    resource?: { attributes: OtlpAttribute[] };
    scopeSpans: Array<{
      scope?: { name: string };
      spans: OtlpSpan[];
    }>;
  }>;
}

export interface ParsedLlmCall {
  provider: 'openai' | 'anthropic' | 'bedrock' | 'other';
  model: string;
  prompt: string;
  response: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
}
