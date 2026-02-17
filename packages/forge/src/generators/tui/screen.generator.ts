/**
 * Generator for TUI Ink screen components
 */

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { generateTuiScreenTemplate } from '../../templates/tui/screen.template.js';
import { generateTuiHook } from './hook.generator.js';

export async function generateTuiScreen(name: string): Promise<string> {
  const dir = resolve(process.cwd(), 'packages/cli/src/tui/screens');
  await mkdir(dir, { recursive: true });

  // Ensure the useApi hook exists (screens depend on it)
  const hookPath = resolve(
    process.cwd(),
    'packages/cli/src/tui/hooks/use-api.ts',
  );
  if (!existsSync(hookPath)) {
    await generateTuiHook('use-api');
  }

  const filePath = resolve(dir, `${name}.tsx`);
  const content = generateTuiScreenTemplate(name);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}
