/**
 * Generates a release video using the Remotion project.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createLogger } from '@flusk/logger';
import type { ReleaseData } from '../types.js';

const execFileAsync = promisify(execFile);
const log = createLogger({ name: 'marketing:video' });

const VIDEOS_DIR = resolve(import.meta.dirname, '../../videos');

export async function generateReleaseVideo(
  release: ReleaseData,
  outputDir: string,
): Promise<{ mp4: string; gif: string }> {
  await mkdir(outputDir, { recursive: true });

  const propsPath = resolve(outputDir, 'video-props.json');
  await writeFile(propsPath, JSON.stringify({
    version: release.version,
    headline: release.headline,
    features: release.features.slice(0, 5),
  }));

  const mp4Path = resolve(outputDir, 'release-video.mp4');
  const gifPath = resolve(outputDir, 'release-video.gif');

  try {
    log.info('Rendering MP4...');
    await execFileAsync('npx', [
      'remotion', 'render', 'src/index.ts', 'DemoVideo',
      mp4Path, '--props', propsPath,
    ], { cwd: VIDEOS_DIR, timeout: 120_000 });

    log.info('Rendering GIF...');
    await execFileAsync('npx', [
      'remotion', 'render', 'src/index.ts', 'DemoVideo',
      gifPath, '--image-format=png', '--props', propsPath,
    ], { cwd: VIDEOS_DIR, timeout: 120_000 });
  } catch (err) {
    log.warn('Video rendering failed (Remotion may not be installed)');
    log.debug(String(err));
    return { mp4: '', gif: '' };
  }

  log.info('Video rendering complete');
  return { mp4: mp4Path, gif: gifPath };
}
