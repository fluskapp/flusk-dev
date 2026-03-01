/**
 * Auto-instrumentation registry — detect and patch installed LLM SDKs.
 */

import { createLogger } from '@flusk/logger';
import { patchOpenai } from './openai.js';
import { patchAnthropic } from './anthropic.js';
import { patchGoogle } from './google.js';
import { patchCohere } from './cohere.js';

const log = createLogger({ name: 'otel-auto-instrument' });

export interface DetectedSdk {
  name: string;
  pkg: string;
}

const SDK_REGISTRY: Array<{ name: string; pkg: string; patch: () => void }> = [
  { name: 'openai', pkg: 'openai', patch: patchOpenai },
  { name: 'anthropic', pkg: '@anthropic-ai/sdk', patch: patchAnthropic },
  { name: 'google', pkg: '@google/generative-ai', patch: patchGoogle },
  { name: 'cohere', pkg: 'cohere-ai', patch: patchCohere },
];

/** Detect which LLM SDKs are installed. */
export function detectInstalledSdks(): DetectedSdk[] {
  const found: DetectedSdk[] = [];
  for (const entry of SDK_REGISTRY) {
    try {
      require.resolve(entry.pkg);
      found.push({ name: entry.name, pkg: entry.pkg });
    } catch {
      /* not installed */
    }
  }
  return found;
}

/** Patch all detected SDKs. Returns list of patched names. */
export function autoInstrument(): string[] {
  const patched: string[] = [];
  for (const entry of SDK_REGISTRY) {
    try {
      entry.patch();
      patched.push(entry.name);
    } catch {
      log.debug({ sdk: entry.name }, 'SDK not available');
    }
  }
  log.info({ patched }, 'Auto-instrumentation complete');
  return patched;
}
