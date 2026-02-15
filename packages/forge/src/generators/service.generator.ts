/**
 * Service generator - creates service classes with dependency injection
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { generateServiceTemplate, generateServiceTestTemplate } from '../templates/service/service.template.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

export async function generateService(serviceName: string): Promise<GeneratorResult[]> {
  const results: GeneratorResult[] = [];
  const servicesDir = resolve(process.cwd(), 'packages/business-logic/src/services');
  const testsDir = resolve(process.cwd(), 'packages/business-logic/src/services/__tests__');

  // Ensure directories exist
  if (!existsSync(servicesDir)) {
    await mkdir(servicesDir, { recursive: true });
  }
  if (!existsSync(testsDir)) {
    await mkdir(testsDir, { recursive: true });
  }

  // Generate service file
  const serviceContent = generateServiceTemplate(serviceName);
  const servicePath = resolve(servicesDir, `${serviceName}.service.ts`);
  await writeFile(servicePath, serviceContent, 'utf-8');

  results.push({
    path: `business-logic/services/${serviceName}.service.ts`,
    content: serviceContent
  });

  // Generate test file
  const testContent = generateServiceTestTemplate(serviceName);
  const testPath = resolve(testsDir, `${serviceName}.service.test.ts`);
  await writeFile(testPath, testContent, 'utf-8');

  results.push({
    path: `business-logic/services/__tests__/${serviceName}.service.test.ts`,
    content: testContent
  });

  return results;
}
