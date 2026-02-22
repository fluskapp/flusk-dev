// --- BEGIN CUSTOM ---
/**
 * LangChain callback handler adapter for Flusk OTel instrumentation.
 * Emits gen_ai.* spans for each LLM call made through LangChain.
 */
import { trace, SpanKind, SpanStatusCode, context } from '@opentelemetry/api';

const TRACER_NAME = 'flusk-langchain';

export interface FluskCallbackOptions {
  agent?: string;
}

/**
 * LangChain-compatible callback handler that creates OTel spans.
 * Pass as a callback to LangChain chains, agents, or LLMs.
 */
export class FluskCallbackHandler {
  private tracer = trace.getTracer(TRACER_NAME);
  private agent: string | undefined;
  private spans = new Map<string, ReturnType<typeof this.tracer.startSpan>>();

  constructor(opts?: FluskCallbackOptions) {
    this.agent = opts?.agent;
  }

  handleLLMStart(
    llm: { id: string[] },
    prompts: string[],
    runId: string,
  ): void {
    const model = llm.id[llm.id.length - 1] || 'unknown';
    const span = this.tracer.startSpan(`langchain ${model}`, {
      kind: SpanKind.CLIENT,
    }, context.active());
    span.setAttribute('gen_ai.system', 'langchain');
    span.setAttribute('gen_ai.request.model', model);
    if (this.agent) span.setAttribute('flusk.agent', this.agent);
    if (prompts[0]) span.setAttribute('gen_ai.prompt', prompts[0]);
    this.spans.set(runId, span);
  }

  handleLLMEnd(output: { generations: Array<Array<{ text: string }>>; llmOutput?: Record<string, unknown> }, runId: string): void {
    const span = this.spans.get(runId);
    if (!span) return;
    const text = output.generations[0]?.[0]?.text;
    if (text) span.setAttribute('gen_ai.completion', text);
    const usage = output.llmOutput?.['tokenUsage'] as Record<string, number> | undefined;
    if (usage) {
      span.setAttribute('gen_ai.usage.input_tokens', usage['promptTokens'] || 0);
      span.setAttribute('gen_ai.usage.output_tokens', usage['completionTokens'] || 0);
    }
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    this.spans.delete(runId);
  }

  handleLLMError(err: Error, runId: string): void {
    const span = this.spans.get(runId);
    if (!span) return;
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    span.end();
    this.spans.delete(runId);
  }
}
// --- END CUSTOM ---
