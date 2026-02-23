/**
 * Individual infrastructure file generators.
 */

import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { generateDockerComposeTemplate } from '../../templates/infrastructure/docker-compose.template.js';
import { generateGitignoreTemplate } from '../../templates/infrastructure/gitignore.template.js';
import { generateEnvTemplate } from '../../templates/infrastructure/env.template.js';
import { generateWattTemplate } from '../../templates/infrastructure/watt.template.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

/**
 * Generate docker-compose.yml
 */
export async function generateDockerCompose(
  projectName: string,
  targetDir: string
): Promise<GeneratorResult> {
  const outputPath = resolve(targetDir, 'docker-compose.yml');
  const content = generateDockerComposeTemplate({ projectName });

  await writeFile(outputPath, content, 'utf-8');

  return {
    path: 'docker-compose.yml',
    content
  };
}

/**
 * Generate .gitignore
 */
export async function generateGitignore(targetDir: string): Promise<GeneratorResult> {
  const outputPath = resolve(targetDir, '.gitignore');
  const content = generateGitignoreTemplate();

  await writeFile(outputPath, content, 'utf-8');

  return {
    path: '.gitignore',
    content
  };
}

/**
 * Generate .env.example
 */
export async function generateEnvExample(
  projectName: string,
  targetDir: string
): Promise<GeneratorResult> {
  const outputPath = resolve(targetDir, '.env.example');
  const content = generateEnvTemplate({ projectName });

  await writeFile(outputPath, content, 'utf-8');

  return {
    path: '.env.example',
    content
  };
}

/**
 * Generate watt.json
 */
export async function generateWattConfig(
  projectName: string,
  targetDir: string
): Promise<GeneratorResult> {
  const outputPath = resolve(targetDir, 'watt.json');
  const content = generateWattTemplate({ projectName });

  await writeFile(outputPath, content, 'utf-8');

  return {
    path: 'watt.json',
    content
  };
}
