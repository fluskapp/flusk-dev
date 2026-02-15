/**
 * .env.example generator (standalone)
 */

import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { generateEnvTemplate } from '../templates/infrastructure/env.template.js';
import type { EnvTemplateOptions } from '../templates/infrastructure/env.template.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

export async function generateEnv(
  options: EnvTemplateOptions
): Promise<GeneratorResult> {
  const content = generateEnvTemplate(options);
  const outputPath = resolve(process.cwd(), '.env.example');
  await writeFile(outputPath, content, 'utf-8');
  return { path: '.env.example', content };
}
