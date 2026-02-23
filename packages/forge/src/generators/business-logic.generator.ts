/**
 * Business logic generator - creates pure function stubs
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { toPascalCase } from './utils.js';
import {
  exampleFunctionContent,
  indexContent,
} from './business-logic-templates.js';

export interface GeneratorResult {
  path: string;
  content: string;
}

export async function generateBusinessLogic(
  entityPath: string,
  entityName: string,
): Promise<GeneratorResult[]> {
  const results: GeneratorResult[] = [];
  const pascalName = toPascalCase(entityName);
  const outputDir = resolve(
    process.cwd(),
    `packages/business-logic/src/${entityName}`,
  );

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const exampleFunc = await generateExampleFunction(
    entityName, pascalName, outputDir,
  );
  results.push(exampleFunc);

  const indexFile = await generateIndex(
    entityName, pascalName, outputDir,
  );
  results.push(indexFile);

  return results;
}

async function generateExampleFunction(
  entityName: string,
  pascalName: string,
  outputDir: string,
): Promise<GeneratorResult> {
  const outputPath = resolve(outputDir, `validate-${entityName}.function.ts`);
  const content = exampleFunctionContent(entityName, pascalName);
  await writeFile(outputPath, content, 'utf-8');
  return {
    path: `business-logic/${entityName}/validate-${entityName}.function.ts`,
    content,
  };
}

async function generateIndex(
  entityName: string,
  pascalName: string,
  outputDir: string,
): Promise<GeneratorResult> {
  const outputPath = resolve(outputDir, 'index.ts');
  const content = indexContent(entityName, pascalName);
  await writeFile(outputPath, content, 'utf-8');
  return {
    path: `business-logic/${entityName}/index.ts`,
    content,
  };
}
