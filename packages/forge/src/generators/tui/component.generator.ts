/**
 * Generator for TUI Ink components
 */

import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { generateTuiComponentTemplate } from '../../templates/tui/component.template.js';

export async function generateTuiComponent(name: string): Promise<string> {
  const dir = resolve(process.cwd(), 'packages/cli/src/tui/components');
  await mkdir(dir, { recursive: true });
  const filePath = resolve(dir, `${name}.tsx`);
  const content = generateTuiComponentTemplate(name);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}
