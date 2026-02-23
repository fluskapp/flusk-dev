/**
 * Pipeline generation — reads YAML and writes output files.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import type { PipelineGenResult } from './pipeline.types.js';
import { toKebab, loadPipelineSchema } from './pipeline-helpers.js';
import { generatePipelineCode, generatePipelineTest } from './pipeline-codegen.js';

/** Main: generate pipeline from YAML path */
export async function generatePipeline(
  yamlPath: string,
  rootDir: string,
): Promise<PipelineGenResult> {
  const schema = await loadPipelineSchema(yamlPath);
  const kebab = toKebab(schema.name);
  const nsDir = resolve(
    rootDir,
    'packages',
    schema.package,
    'src',
    schema.namespace,
  );
  await mkdir(nsDir, { recursive: true });

  const code = generatePipelineCode(schema);
  const codePath = resolve(nsDir, `${kebab}.pipeline.ts`);
  await writeFile(codePath, code);

  const files: PipelineGenResult['files'] = [
    { path: codePath, action: 'created' },
  ];

  if (schema.tests && schema.tests.length > 0) {
    const testDir = resolve(nsDir, '__tests__');
    await mkdir(testDir, { recursive: true });
    const testCode = generatePipelineTest(schema);
    const testPath = resolve(testDir, `${kebab}.pipeline.test.ts`);
    await writeFile(testPath, testCode);
    files.push({ path: testPath, action: 'created' });
  }

  return { files };
}

/** Generate all pipelines from a directory */
export async function generateAllPipelines(
  pipelinesDir: string,
  rootDir: string,
): Promise<PipelineGenResult> {
  const allFiles: PipelineGenResult['files'] = [];

  let entries: string[];
  try {
    entries = await readdir(pipelinesDir);
  } catch {
    return { files: [] };
  }

  const yamls = entries.filter((f) => f.endsWith('.pipeline.yaml'));

  for (const yaml of yamls) {
    const result = await generatePipeline(
      resolve(pipelinesDir, yaml),
      rootDir,
    );
    allFiles.push(...result.files);
  }

  return { files: allFiles };
}
