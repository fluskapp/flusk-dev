/**
 * Execution generator - creates routes, plugins, and hooks
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { generateRoutesTemplate } from '../templates/routes.template.js';
import { generatePluginTemplate } from '../templates/plugin.template.js';
import { generateHooksTemplate } from '../templates/hooks.template.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

export async function generateExecution(
  entityPath: string,
  entityName: string
): Promise<GeneratorResult[]> {
  const results: GeneratorResult[] = [];

  // Generate routes
  const routeResult = await generateRoutes(entityName);
  results.push(routeResult);

  // Generate plugin
  const pluginResult = await generatePlugin(entityName);
  results.push(pluginResult);

  // Generate hooks
  const hooksResult = await generateHooks(entityName);
  results.push(hooksResult);

  return results;
}

async function generateRoutes(entityName: string): Promise<GeneratorResult> {
  const outputDir = resolve(process.cwd(), 'packages/execution/src/routes');
  const outputPath = resolve(outputDir, `${entityName}.routes.ts`);

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const content = generateRoutesTemplate(entityName);
  await writeFile(outputPath, content, 'utf-8');

  return {
    path: `execution/routes/${entityName}.routes.ts`,
    content
  };
}

async function generatePlugin(entityName: string): Promise<GeneratorResult> {
  const outputDir = resolve(process.cwd(), 'packages/execution/src/plugins');
  const outputPath = resolve(outputDir, `${entityName}.plugin.ts`);

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const content = generatePluginTemplate(entityName);
  await writeFile(outputPath, content, 'utf-8');

  return {
    path: `execution/plugins/${entityName}.plugin.ts`,
    content
  };
}

async function generateHooks(entityName: string): Promise<GeneratorResult> {
  const outputDir = resolve(process.cwd(), 'packages/execution/src/hooks');
  const outputPath = resolve(outputDir, `${entityName}.hooks.ts`);

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const content = generateHooksTemplate(entityName);
  await writeFile(outputPath, content, 'utf-8');

  return {
    path: `execution/hooks/${entityName}.hooks.ts`,
    content
  };
}
