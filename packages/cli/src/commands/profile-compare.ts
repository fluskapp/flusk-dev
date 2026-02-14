/** @generated —
 * CLI command: flusk profile compare <id1> <id2>
 * Side-by-side comparison of two profile sessions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { request } from 'undici';

interface ProfileSession {
  id: string;
  name: string;
  type: string;
  durationMs: number;
  totalSamples: number;
  hotspots: Array<{ functionName: string; samples: number; percentage: number }>;
}

export function formatDiff(label: string, a: number, b: number, unit = ''): string {
  const diff = b - a;
  const pct = a > 0 ? ((diff / a) * 100).toFixed(1) : 'N/A';
  const arrow = diff < 0
    ? chalk.green(`▼ ${Math.abs(diff)}${unit} (${pct}%)`)
    : diff > 0
      ? chalk.red(`▲ ${diff}${unit} (+${pct}%)`)
      : chalk.dim('unchanged');
  return `  ${label.padEnd(16)} ${String(a) + unit} → ${String(b) + unit}  ${arrow}`;
}

export function formatHotspotDiff(
  a: ProfileSession, b: ProfileSession,
): string {
  const bMap = new Map(b.hotspots.map((h) => [h.functionName, h]));
  const lines = a.hotspots.slice(0, 5).map((h) => {
    const match = bMap.get(h.functionName);
    if (!match) return `  ${h.functionName.slice(0, 30).padEnd(32)} ${chalk.dim('removed')}`;
    const diff = match.percentage - h.percentage;
    const color = diff < 0 ? chalk.green : diff > 0 ? chalk.red : chalk.dim;
    return `  ${h.functionName.slice(0, 30).padEnd(32)} ${h.percentage.toFixed(1)}% → ${match.percentage.toFixed(1)}% ${color(`(${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)`)}`;
  });
  return lines.join('\n');
}

async function fetchProfile(endpoint: string, id: string, headers: Record<string, string>): Promise<ProfileSession> {
  const res = await request(`${endpoint}/v1/profiles/${id}`, { headers });
  return (await res.body.json()) as ProfileSession;
}

export const profileCompareCommand = new Command('compare')
  .description('Compare two profile sessions')
  .argument('<id1>', 'First profile session ID')
  .argument('<id2>', 'Second profile session ID')
  .option('-e, --endpoint <url>', 'API endpoint', 'http://localhost:3042')
  .option('-k, --api-key <key>', 'API key')
  .action(async (id1: string, id2: string, opts) => {
    const headers: Record<string, string> = {};
    if (opts.apiKey) headers['x-flusk-api-key'] = opts.apiKey;

    const [a, b] = await Promise.all([
      fetchProfile(opts.endpoint, id1, headers),
      fetchProfile(opts.endpoint, id2, headers),
    ]);

    console.log(chalk.blue(`\n⚖️  Comparing: ${chalk.bold(a.name)} vs ${chalk.bold(b.name)}\n`));
    console.log(formatDiff('Duration', a.durationMs, b.durationMs, 'ms'));
    console.log(formatDiff('Samples', a.totalSamples, b.totalSamples));

    console.log(chalk.bold('\nHotspot Changes'));
    console.log(formatHotspotDiff(a, b));
    console.log('');
  });
