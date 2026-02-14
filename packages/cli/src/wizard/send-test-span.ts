/** @generated —
 * Send a real OpenAI call through Flusk, return trace data.
 */

const TEST_PROMPT = 'Explain what an LLM proxy is in one sentence.';

export interface TraceResult {
  model: string;
  prompt: string;
  response: string;
  tokens: { prompt: number; completion: number; total: number };
  latencyMs: number;
  cached: boolean;
  estimatedCost: number;
}

export async function sendTestSpan(openAiKey: string, fluskEndpoint: string): Promise<TraceResult> {
  const start = Date.now();
  const res = await fetch(`${fluskEndpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: TEST_PROMPT }],
      max_tokens: 80,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error');
    throw new Error(`LLM call failed (${res.status}): ${err}`);
  }

  const body = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };
  const latencyMs = Date.now() - start;
  const usage = body.usage;

  return {
    model: body.model,
    prompt: TEST_PROMPT,
    response: body.choices[0]?.message?.content ?? '',
    tokens: { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens },
    latencyMs,
    cached: latencyMs < 200,
    estimatedCost: (usage.prompt_tokens * 0.00015 + usage.completion_tokens * 0.0006) / 1000,
  };
}
