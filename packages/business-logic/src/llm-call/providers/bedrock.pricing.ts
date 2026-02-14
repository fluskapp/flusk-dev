/** @generated —
 * AWS Bedrock provider pricing (USD per 1M tokens)
 * On-demand pricing as of February 2026
 */
export const BEDROCK_PRICING: Record<string, { input: number; output: number }> = {
  'anthropic.claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic.claude-3-sonnet': { input: 3.0, output: 15.0 },
  'anthropic.claude-3-haiku': { input: 0.25, output: 1.25 },
  'anthropic.claude-3-opus': { input: 15.0, output: 75.0 },
  'amazon.titan-text-express': { input: 0.2, output: 0.6 },
  'amazon.titan-text-lite': { input: 0.15, output: 0.2 },
  'amazon.titan-text-premier': { input: 0.5, output: 1.5 },
  'meta.llama3-8b-instruct': { input: 0.3, output: 0.6 },
  'meta.llama3-70b-instruct': { input: 2.65, output: 3.5 },
  'mistral.mistral-7b-instruct': { input: 0.15, output: 0.2 },
  'mistral.mixtral-8x7b-instruct': { input: 0.45, output: 0.7 },
};
