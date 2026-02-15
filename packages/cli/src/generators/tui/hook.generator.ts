/**
 * Generator for TUI React hooks
 */

import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { generateTuiHookTemplate } from '../../templates/tui/hook.template.js';

export async function generateTuiHook(name: string): Promise<string> {
  const dir = resolve(process.cwd(), 'packages/cli/src/tui/hooks');
  await mkdir(dir, { recursive: true });
  const filePath = resolve(dir, `${name}.ts`);
  const content = generateTuiHookTemplate(name);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}
