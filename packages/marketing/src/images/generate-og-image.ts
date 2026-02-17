/**
 * Generates an OG image for the release.
 * Uses Remotion still rendering if available, otherwise skips.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createLogger } from '@flusk/logger';
import type { ReleaseData } from '../types.js';

const execFileAsync = promisify(execFile);
const log = createLogger({ name: 'marketing:og-image' });

const VIDEOS_DIR = resolve(import.meta.dirname, '../../videos');

export async function generateOgImage(
  release: ReleaseData,
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const propsPath = resolve(outputDir, 'og-props.json');
  await writeFile(propsPath, JSON.stringify({
    version: release.version,
    headline: release.headline,
    features: release.features.slice(0, 3),
  }));

  const outputPath = resolve(outputDir, 'og-image.png');

  try {
    log.info('Rendering OG image...');
    await execFileAsync('npx', [
      'remotion', 'still', 'src/index.ts', 'DemoVideo',
      outputPath, '--props', propsPath,
    ], { cwd: VIDEOS_DIR, timeout: 60_000 });
    log.info('OG image rendered');
    return outputPath;
  } catch (err) {
    log.warn('OG image rendering failed (Remotion may not be installed)');
    log.debug(String(err));
    return '';
  }
}
