/**
 * File writer utility for the entity generation pipeline.
 *
 * WHY: Encapsulates smart-merge logic for writing generated files,
 * preserving custom sections when files already exist.
 */

import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { smartMerge } from '../regeneration/smart-merge.js';

const logger = createLogger({ name: 'schema:pipeline' });

/** Write a file with smart-merge if it already exists */
export function writeGeneratedFile(
  dir: string,
  filename: string,
  content: string,
  files: Array<{ path: string; action: 'created' | 'updated' }>,
): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fullPath = resolve(dir, filename);
  const action = existsSync(fullPath) ? 'updated' : 'created';
  if (action === 'updated') {
    const existing = readFileSync(fullPath, 'utf-8');
    const merged = smartMerge(content, existing);
    writeFileSync(fullPath, merged.content, 'utf-8');
    logger.debug(
      { file: filename, preserved: merged.customSectionsPreserved },
      'Merged',
    );
  } else {
    writeFileSync(fullPath, content, 'utf-8');
  }
  files.push({ path: fullPath, action });
  logger.debug({ file: filename, action }, 'File written');
}
