/** @generated —
 * AWS Bedrock span detection config for OTLP parsing
 */
export const BEDROCK_SYSTEM_VALUES = [
  'aws.bedrock',
  'aws_bedrock',
  'bedrock',
];

export const BEDROCK_MODEL_PREFIXES = [
  'anthropic.',
  'amazon.titan',
  'meta.llama',
  'mistral.',
  'cohere.',
  'ai21.',
];

/**
 * Extract normalized model name from Bedrock model ID
 * e.g. "anthropic.claude-3-sonnet-20240229-v1:0" → "anthropic.claude-3-sonnet"
 */
export function normalizBedrockModelId(modelId: string): string {
  // Strip version suffix like "-20240229-v1:0" or "-v1:0"
  return modelId.replace(/-\d{8}-v\d+:\d+$/, '').replace(/-v\d+:\d+$/, '');
}
