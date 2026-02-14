/**
 * CLI command: flusk profile list
 * Lists recent profile sessions from the API
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { request } from 'undici';

export interface ProfileSummary {
  id: string;
  name: string;
  type: string;
  durationMs: number;
  totalSamples: number;
  createdAt: string;
}

export function formatTable(profiles: ProfileSummary[]): string {
  const header = `${'ID'.padEnd(10)} ${'Name'.padEnd(24)} ${'Type'.padEnd(6)} ${'Duration'.padEnd(10)} ${'Samples'.padEnd(8)} Date`;
  const sep = '-'.repeat(header.length);
  const rows = profiles.map((p) => {
    const id = p.id.slice(0, 8);
    const name = p.name.slice(0, 22).padEnd(24);
    const type = p.type.padEnd(6);
    const dur = `${p.durationMs}ms`.padEnd(10);
    const samples = String(p.totalSamples).padEnd(8);
    const date = new Date(p.createdAt).toLocaleDateString();
    return `${id.padEnd(10)} ${name} ${type} ${dur} ${samples} ${date}`;
  });
  return [header, sep, ...rows].join('\n');
}

export const profileListCommand = new Command('list')
  .description('List recent profile sessions')
  .option('-e, --endpoint <url>', 'API endpoint', 'http://localhost:3042')
  .option('-k, --api-key <key>', 'API key')
  .option('-l, --limit <n>', 'Max results', '20')
  .action(async (opts) => {
    const url = `${opts.endpoint}/v1/profiles?limit=${opts.limit}`;
    const headers: Record<string, string> = {};
    if (opts.apiKey) headers['x-flusk-api-key'] = opts.apiKey;

    const res = await request(url, { headers });
    const profiles = (await res.body.json()) as ProfileSummary[];

    if (!profiles.length) {
      console.log(chalk.yellow('No profile sessions found.'));
      return;
    }

    console.log(chalk.blue('\n📊 Profile Sessions\n'));
    console.log(formatTable(profiles));
    console.log('');
  });
