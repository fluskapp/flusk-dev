/**
 * Generate / merge .env file with validated config.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface EnvConfig {
  openAiKey: string;
  anthropicKey?: string;
  projectName: string;
  fluskEndpoint?: string;
}

function buildEnvEntries(cfg: EnvConfig): Record<string, string> {
  return {
    FLUSK_API_KEY: randomUUID(),
    OPENAI_API_KEY: cfg.openAiKey,
    ...(cfg.anthropicKey ? { ANTHROPIC_API_KEY: cfg.anthropicKey } : {}),
    FLUSK_PROJECT_NAME: cfg.projectName,
    FLUSK_ENDPOINT: cfg.fluskEndpoint ?? 'http://localhost:4318',
  };
}

function parseEnv(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) map.set(match[1], match[2]);
  }
  return map;
}

function serializeEnv(map: Map<string, string>): string {
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
}

export async function generateEnvFile(projectRoot: string, cfg: EnvConfig): Promise<string> {
  const envPath = resolve(projectRoot, '.env');
  const existing = existsSync(envPath)
    ? parseEnv(await readFile(envPath, 'utf-8'))
    : new Map<string, string>();

  const newEntries = buildEnvEntries(cfg);
  for (const [k, v] of Object.entries(newEntries)) {
    existing.set(k, v);
  }

  const content = serializeEnv(existing);
  await writeFile(envPath, content, 'utf-8');
  return envPath;
}
