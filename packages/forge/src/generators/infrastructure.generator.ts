/**
 * Infrastructure generator — creates docker-compose.yml, .gitignore,
 * .env.example, watt.json.
 */

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { GeneratorResult } from './infrastructure/infra-file-generators.js';
import {
  generateDockerCompose,
  generateGitignore,
  generateEnvExample,
  generateWattConfig,
} from './infrastructure/infra-file-generators.js';

export type { GeneratorResult };
export { generateInitDbScript } from './infrastructure/infra-init-db.js';

export interface InfrastructureOptions {
  projectName: string;
  targetDir?: string;
  skipDockerCompose?: boolean;
  skipGitignore?: boolean;
  skipEnv?: boolean;
  skipWatt?: boolean;
}

/**
 * Generate all infrastructure files
 */
export async function generateInfrastructure(
  options: InfrastructureOptions
): Promise<GeneratorResult[]> {
  const results: GeneratorResult[] = [];
  const { projectName, targetDir = process.cwd() } = options;

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  if (!options.skipDockerCompose) {
    results.push(await generateDockerCompose(projectName, targetDir));
  }
  if (!options.skipGitignore) {
    results.push(await generateGitignore(targetDir));
  }
  if (!options.skipEnv) {
    results.push(await generateEnvExample(projectName, targetDir));
  }
  if (!options.skipWatt) {
    results.push(await generateWattConfig(projectName, targetDir));
  }

  return results;
}
