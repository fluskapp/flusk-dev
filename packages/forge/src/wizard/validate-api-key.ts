/**
 * Validate API keys by making minimal API calls.
 * Uses native fetch — no extra dependencies.
 */

export interface OpenAiValidation {
  valid: boolean;
  models: string[];
  error?: string;
}

export interface AnthropicValidation {
  valid: boolean;
  error?: string;
}

export async function validateOpenAiKey(key: string): Promise<OpenAiValidation> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { valid: false, models: [], error: (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { data: Array<{ id: string }> };
    const models = body.data.map((m) => m.id).filter((id) => id.startsWith('gpt'));
    return { valid: true, models };
  } catch (err) {
    return { valid: false, models: [], error: (err as Error).message };
  }
}

export async function validateAnthropicKey(key: string): Promise<AnthropicValidation> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
      if (res.status === 401) return { valid: false, error: msg };
      // 400/429 still means the key is valid
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}
