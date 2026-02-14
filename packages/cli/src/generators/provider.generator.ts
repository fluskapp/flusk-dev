/** @generated —
 * Provider generator - scaffolds LLM provider integration files
 * Creates: pricing config, span parser constants, test file
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { toPascalCase } from './utils.js';

export interface ProviderResult {
  files: { path: string; action: 'created' | 'updated' }[];
}

/**
 * Generate LLM provider integration scaffolding
 */
export async function generateProvider(
  providerName: string
): Promise<ProviderResult> {
  const root = process.cwd();
  const result: ProviderResult = { files: [] };

  await generatePricing(providerName, root, result);
  await generateSpanConfig(providerName, root, result);
  await generateProviderTest(providerName, root, result);

  return result;
}

async function generatePricing(
  name: string,
  root: string,
  result: ProviderResult
): Promise<void> {
  const pascal = toPascalCase(name);
  const dir = resolve(root, `packages/business-logic/src/llm-call/providers`);
  await mkdir(dir, { recursive: true });
  const path = `packages/business-logic/src/llm-call/providers/${name}.pricing.ts`;
  const content = `/**
 * ${pascal} provider pricing (USD per 1M tokens)
 * TODO: Add model pricing entries
 */
export const ${name.toUpperCase().replace(/-/g, '_')}_PRICING: Record<string, { input: number; output: number }> = {
  // TODO: Add models, e.g. 'model-name': { input: 1.0, output: 2.0 },
};
`;
  await writeFile(resolve(root, path), content, 'utf-8');
  result.files.push({ path, action: 'created' });
}

async function generateSpanConfig(
  name: string,
  root: string,
  result: ProviderResult
): Promise<void> {
  const dir = resolve(root, `packages/business-logic/src/llm-call/providers`);
  await mkdir(dir, { recursive: true });
  const path = `packages/business-logic/src/llm-call/providers/${name}.span-config.ts`;
  const content = `/**
 * ${toPascalCase(name)} span detection config for OTLP parsing
 * TODO: Set gen_ai.system values and model prefix patterns
 */
export const ${name.toUpperCase().replace(/-/g, '_')}_SYSTEM_VALUES = [
  // TODO: e.g. 'aws.bedrock', 'aws_bedrock'
];

export const ${name.toUpperCase().replace(/-/g, '_')}_MODEL_PREFIXES = [
  // TODO: e.g. 'anthropic.', 'amazon.'
];
`;
  await writeFile(resolve(root, path), content, 'utf-8');
  result.files.push({ path, action: 'created' });
}

async function generateProviderTest(
  name: string,
  root: string,
  result: ProviderResult
): Promise<void> {
  const dir = resolve(root, `packages/business-logic/src/llm-call/providers`);
  await mkdir(dir, { recursive: true });
  const path = `packages/business-logic/src/llm-call/providers/${name}.test.ts`;
  const content = `import { describe, it, expect } from 'vitest';
// TODO: import pricing and test cost calculations
// TODO: import span config and test detection

describe('${name} provider', () => {
  it('should have pricing for all models', () => {
    // TODO: verify pricing entries
    expect(true).toBe(true);
  });

  it('should detect ${name} spans', () => {
    // TODO: verify system values and model prefixes
    expect(true).toBe(true);
  });
});
`;
  await writeFile(resolve(root, path), content, 'utf-8');
  result.files.push({ path, action: 'created' });
}
