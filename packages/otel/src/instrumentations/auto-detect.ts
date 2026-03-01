/**
 * Auto-detect installed LLM SDKs by checking node_modules.
 */

import { createLogger } from '@flusk/logger';

const log = createLogger({ name: 'otel-detect' });

const KNOWN_SDKS: Record<string, string> = {
  openai: 'openai',
  '@anthropic-ai/sdk': 'anthropic',
  '@google/generative-ai': 'google',
  'cohere-ai': 'cohere',
};

/** Detect installed LLM SDKs in the current project. */
export function detectLlmSdks(cwd?: string): string[] {
  const detected: string[] = [];
  for (const [pkg, name] of Object.entries(KNOWN_SDKS)) {
    try {
      const resolveOpts = cwd ? { paths: [cwd] } : undefined;
      require.resolve(pkg, resolveOpts);
      detected.push(name);
      log.debug({ pkg, name }, 'Detected LLM SDK');
    } catch {
      /* not installed */
    }
  }
  return detected;
}
