/**
 * Load .flusk.config.{js,mjs,ts} from project root
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLogger } from '@flusk/logger';
import type { FluskConfig } from './config.types.js';
import { DEFAULT_CONFIG } from './defaults.js';

const log = createLogger('config');

const CONFIG_FILES = [
  '.flusk.config.ts',
  '.flusk.config.mjs',
  '.flusk.config.js',
];

export async function loadConfig(cwd?: string): Promise<FluskConfig> {
  const root = cwd ?? process.cwd();

  for (const filename of CONFIG_FILES) {
    const fullPath = resolve(root, filename);
    if (!existsSync(fullPath)) continue;

    log.info(`Loading config from ${filename}`);
    try {
      const mod = await importConfigFile(fullPath);
      const userConfig = mod.default ?? mod;
      return mergeConfig(DEFAULT_CONFIG, userConfig);
    } catch (err) {
      log.error(`Failed to load ${filename}`, { error: err });
      throw new Error(`Failed to load ${filename}: ${(err as Error).message}`);
    }
  }

  log.info('No config file found, using defaults');
  return { ...DEFAULT_CONFIG };
}

async function importConfigFile(fullPath: string): Promise<Record<string, unknown>> {
  const url = pathToFileURL(fullPath).href;
  return await import(url) as Record<string, unknown>;
}

export function mergeConfig(
  base: FluskConfig,
  overrides: Partial<FluskConfig>,
): FluskConfig {
  return {
    budget: { ...base.budget, ...overrides.budget },
    alerts: { ...base.alerts, ...overrides.alerts },
    agent: overrides.agent ?? base.agent,
    storage: { ...base.storage, ...overrides.storage },
    profiling: { ...base.profiling, ...overrides.profiling },
  };
}
