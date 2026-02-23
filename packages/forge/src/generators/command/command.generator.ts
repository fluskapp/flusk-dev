/**
 * Command generator — creates CLI command files from a command YAML schema.
 */
import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { GenResult } from './command.types.js';
import { loadSchema } from './command.types.js';
import {
  generateCommandOptionsContent,
  generateCommandContent,
  generateCommandTestContent,
  generateCommandPythonContent,
} from './command-render.js';

export type { CommandOption, CommandSchema, GenResult } from './command.types.js';
export {
  generateCommandOptionsContent,
  generateCommandContent,
  generateCommandTestContent,
  generateCommandPythonContent,
} from './command-render.js';

async function writeGenFile(
  root: string, relPath: string, content: string, result: GenResult,
): Promise<void> {
  const abs = resolve(root, relPath);
  await mkdir(resolve(abs, '..'), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  result.files.push({ path: relPath, action: 'created' });
}

export async function generateCommand(yamlPath: string): Promise<GenResult> {
  const root = process.cwd();
  const schema = await loadSchema(yamlPath);
  const result: GenResult = { files: [] };

  await writeGenFile(root, `packages/cli/src/commands/${schema.name}.ts`,
    generateCommandContent(schema), result);
  await writeGenFile(root, `packages/cli/src/commands/${schema.name}.options.ts`,
    generateCommandOptionsContent(schema), result);
  await writeGenFile(root, `packages/cli/src/commands/__tests__/${schema.name}.test.ts`,
    generateCommandTestContent(schema), result);
  await writeGenFile(root, `flusk-py/src/flusk/commands/${schema.name}.py`,
    generateCommandPythonContent(schema), result);

  return result;
}
