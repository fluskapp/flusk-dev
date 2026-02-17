/**
 * Generator for the root TUI app
 */

import { resolve } from 'node:path';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { generateTuiAppTemplate } from '../../templates/tui/app.template.js';
import type { TuiAppScreen } from '../../templates/tui/app.template.js';

export async function generateTuiApp(): Promise<string> {
  const dir = resolve(process.cwd(), 'packages/cli/src/tui');
  await mkdir(dir, { recursive: true });

  const screens = await discoverScreens(resolve(dir, 'screens'));
  const filePath = resolve(dir, 'app.tsx');
  const content = generateTuiAppTemplate(screens);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

async function discoverScreens(
  screensDir: string,
): Promise<TuiAppScreen[]> {
  try {
    const files = await readdir(screensDir);
    const screens = files
      .filter((f) => f.endsWith('.tsx') && f !== 'index.ts')
      .map((f) => f.replace('.tsx', ''))
      .sort((a, b) => {
        // 'overview' always comes first as the default screen
        if (a === 'overview') return -1;
        if (b === 'overview') return 1;
        return a.localeCompare(b);
      });
    return screens.map((name, i) => ({
      name,
      key: String(i + 1),
    }));
  } catch {
    return [];
  }
}
