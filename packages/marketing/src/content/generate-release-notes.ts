/**
 * Reads changelog/changeset output and generates structured release data.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLogger } from '@flusk/logger';
import type { ReleaseData } from '../types.js';

const log = createLogger({ name: 'marketing:release-notes' });

export async function generateReleaseNotes(
  repoRoot: string,
  version?: string,
): Promise<ReleaseData> {
  const changelogPath = resolve(repoRoot, 'CHANGELOG.md');
  let rawChangelog = '';

  if (existsSync(changelogPath)) {
    rawChangelog = await readFile(changelogPath, 'utf-8');
  } else {
    log.warn('No CHANGELOG.md found, using empty changelog');
  }

  const detectedVersion = version ?? parseLatestVersion(rawChangelog);
  const section = extractVersionSection(rawChangelog, detectedVersion);
  const features = extractBullets(section, 'features');
  const fixes = extractBullets(section, 'bug fixes');
  const breakingChanges = extractBullets(section, 'breaking changes');
  const headline = features[0] ?? fixes[0] ?? `Release ${detectedVersion}`;

  log.info(`Generated release notes for v${detectedVersion}`);

  return {
    version: detectedVersion,
    date: new Date().toISOString().split('T')[0]!,
    headline,
    features,
    fixes,
    breakingChanges,
    rawChangelog: section || rawChangelog.slice(0, 2000),
  };
}

function parseLatestVersion(changelog: string): string {
  const match = changelog.match(/##\s+(\d+\.\d+\.\d+)/);
  return match?.[1] ?? '0.0.0';
}

function extractVersionSection(
  changelog: string,
  version: string,
): string {
  const escaped = version.replace(/\./g, '\\.');
  const re = new RegExp(`## ${escaped}[\\s\\S]*?(?=## \\d|$)`);
  return changelog.match(re)?.[0] ?? '';
}

function extractBullets(section: string, heading: string): string[] {
  const re = new RegExp(
    `### ${heading}[\\s\\S]*?(?=###|$)`,
    'i',
  );
  const block = section.match(re)?.[0] ?? '';
  return block
    .split('\n')
    .filter((l) => l.startsWith('- ') || l.startsWith('* '))
    .map((l) => l.replace(/^[-*]\s+/, '').trim());
}
