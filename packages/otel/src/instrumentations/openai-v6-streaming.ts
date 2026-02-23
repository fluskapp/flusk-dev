/**
 * Streaming wrapper for OpenAI v6 instrumentation.
 */
import { SpanStatusCode } from '@opentelemetry/api';

/** Wrap an async-iterable streaming response with span attributes */
export function wrapStreamingResult(result: any, span: any): any {
  let inputTokens = 0;
  let outputTokens = 0;
  let responseModel = '';
  const chunks: string[] = [];

  const originalIterator = result[Symbol.asyncIterator].bind(result);
  result[Symbol.asyncIterator] = async function* () {
    for await (const chunk of originalIterator()) {
      if (chunk.model) responseModel = chunk.model;
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
      }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') chunks.push(delta);
      yield chunk;
    }
    if (responseModel) span.setAttribute('gen_ai.response.model', responseModel);
    span.setAttribute('gen_ai.usage.input_tokens', inputTokens);
    span.setAttribute('gen_ai.usage.output_tokens', outputTokens);
    if (chunks.length > 0) span.setAttribute('gen_ai.completion', chunks.join(''));
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  };
  return result;
}
