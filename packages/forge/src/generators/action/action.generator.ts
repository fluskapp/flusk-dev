/**
 * Action generator — creates GitHub Action files from an action YAML schema.
 */
import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { GenResult } from './action.types.js';
import { loadSchema } from './action.types.js';
import {
  generateActionYmlContent,
  generateActionIndexContent,
  generateActionTypesContent,
  generateActionTestContent,
} from './action-render.js';

export type { ActionInput, ActionOutput, ActionSchema, GenResult } from './action.types.js';
export {
  generateActionYmlContent,
  generateActionIndexContent,
  generateActionTypesContent,
  generateActionTestContent,
} from './action-render.js';

async function writeGenFile(
  root: string, relPath: string, content: string, result: GenResult,
): Promise<void> {
  const abs = resolve(root, relPath);
  await mkdir(resolve(abs, '..'), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  result.files.push({ path: relPath, action: 'created' });
}

export async function generateAction(yamlPath: string): Promise<GenResult> {
  const root = process.cwd();
  const schema = await loadSchema(yamlPath);
  const result: GenResult = { files: [] };

  await writeGenFile(root, `.github/actions/${schema.name}/action.yml`,
    generateActionYmlContent(schema), result);
  await writeGenFile(root, `.github/actions/${schema.name}/src/index.ts`,
    generateActionIndexContent(schema), result);
  await writeGenFile(root, `.github/actions/${schema.name}/src/types.ts`,
    generateActionTypesContent(schema), result);
  await writeGenFile(root, `.github/actions/${schema.name}/__tests__/action.test.ts`,
    generateActionTestContent(schema), result);

  return result;
}
