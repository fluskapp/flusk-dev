/**
 * Barrel export updater helper — append-if-missing utility
 */

import { readFile, writeFile } from 'node:fs/promises';

/**
 * Append a line to a file if it doesn't already contain the marker
 */
export async function appendIfMissing(
  filePath: string,
  marker: string,
  content: string,
): Promise<boolean> {
  const existing = await readFile(filePath, 'utf-8');
  if (existing.includes(marker)) return false;
  await writeFile(
    filePath,
    existing.trimEnd() + '\n\n' + content + '\n',
    'utf-8',
  );
  return true;
}
