/**
 * Middleware generator - creates Fastify middleware functions
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { generateMiddlewareTemplate, generateMiddlewareTestTemplate } from '../templates/middleware/middleware.template.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

export async function generateMiddleware(middlewareName: string): Promise<GeneratorResult[]> {
  const results: GeneratorResult[] = [];
  const middlewareDir = resolve(process.cwd(), 'packages/execution/src/middleware');
  const testsDir = resolve(process.cwd(), 'packages/execution/src/middleware/__tests__');

  // Ensure directories exist
  if (!existsSync(middlewareDir)) {
    await mkdir(middlewareDir, { recursive: true });
  }
  if (!existsSync(testsDir)) {
    await mkdir(testsDir, { recursive: true });
  }

  // Generate middleware file
  const middlewareContent = generateMiddlewareTemplate(middlewareName);
  const middlewarePath = resolve(middlewareDir, `${middlewareName}.middleware.ts`);
  await writeFile(middlewarePath, middlewareContent, 'utf-8');

  results.push({
    path: `execution/middleware/${middlewareName}.middleware.ts`,
    content: middlewareContent
  });

  // Generate test file
  const testContent = generateMiddlewareTestTemplate(middlewareName);
  const testPath = resolve(testsDir, `${middlewareName}.middleware.test.ts`);
  await writeFile(testPath, testContent, 'utf-8');

  results.push({
    path: `execution/middleware/__tests__/${middlewareName}.middleware.test.ts`,
    content: testContent
  });

  return results;
}
