/**
 * Parse Google Gemini API response for token usage and model info.
 */

import type { TokenUsage } from '../cost-calculator.js';

interface GoogleParsed {
  model: string;
  tokens: TokenUsage;
}

/** Parse Google generateContent response. */
export function parseGoogleResponse(body: unknown): GoogleParsed | null {
  const resp = body as Record<string, unknown> | null;
  if (!resp) return null;

  const meta = resp['usageMetadata'] as Record<string, number> | undefined;
  const model = (resp['modelVersion'] as string) ?? 'gemini-unknown';
  const tokens: TokenUsage = {
    input: meta?.['promptTokenCount'] ?? 0,
    output: meta?.['candidatesTokenCount'] ?? 0,
    total: (meta?.['promptTokenCount'] ?? 0) + (meta?.['candidatesTokenCount'] ?? 0),
  };

  return { model, tokens };
}
