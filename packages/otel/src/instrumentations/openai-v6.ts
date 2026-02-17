/**
 * Lightweight OpenAI SDK v6 instrumentation.
 * Wraps `chat.completions.create` to emit gen_ai.* span attributes.
 * Works with openai@6.x where @traceloop/instrumentation-openai doesn't.
 */
import { trace, SpanKind, SpanStatusCode, context } from '@opentelemetry/api';

const TRACER_NAME = 'flusk-openai-v6';

/**
 * Patch the OpenAI module to add GenAI span attributes.
 * Call this after the OpenAI module is loaded.
 */
export function patchOpenAI(): void {
  try {
    // Dynamic import to avoid hard dependency
    import('openai').then((mod) => {
      const OpenAI = mod.default || mod;
      patchCompletionsCreate(OpenAI);
    }).catch(() => {
      // openai not installed — nothing to patch
    });
  } catch {
    // ignore
  }
}

function patchCompletionsCreate(OpenAI: any): void {
  // Patch the prototype of Completions class
  const proto = OpenAI?.Chat?.Completions?.prototype;
  if (!proto || proto.__flusk_patched) return;

  const original = proto.create;
  if (typeof original !== 'function') return;

  proto.create = function patchedCreate(this: any, body: any, options?: any) {
    const tracer = trace.getTracer(TRACER_NAME);
    const model = body?.model || 'unknown';
    const messages = body?.messages || [];
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const prompt = lastUserMsg?.content || '';

    return tracer.startActiveSpan(
      `chat ${model}`,
      { kind: SpanKind.CLIENT },
      context.active(),
      async (span) => {
        span.setAttribute('gen_ai.system', 'openai');
        span.setAttribute('gen_ai.request.model', model);
        span.setAttribute('gen_ai.prompt', typeof prompt === 'string' ? prompt : JSON.stringify(prompt));

        try {
          const result = await original.call(this, body, options);

          if (result?.model) span.setAttribute('gen_ai.response.model', result.model);
          if (result?.usage) {
            span.setAttribute('gen_ai.usage.input_tokens', result.usage.prompt_tokens || 0);
            span.setAttribute('gen_ai.usage.output_tokens', result.usage.completion_tokens || 0);
          }
          if (result?.choices?.[0]?.message?.content) {
            span.setAttribute('gen_ai.completion', result.choices[0].message.content);
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (err: any) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
          span.end();
          throw err;
        }
      },
    );
  };

  proto.__flusk_patched = true;
}
