/** @generated —
 * CLI command: flusk profile report <session-id>
 * Fetches and pretty-prints a profile session with correlations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { request } from 'undici';

export interface Hotspot {
  functionName: string;
  samples: number;
  percentage: number;
  file?: string;
}

export interface Correlation {
  model: string;
  durationMs: number;
  cost: number;
  traceId: string;
}

export interface ReportData {
  correlations: Correlation[];
  suggestions: string[];
}

export function formatHotspots(hotspots: Hotspot[]): string {
  const header = `${'Function'.padEnd(40)} ${'Samples'.padEnd(10)} %`;
  const rows = hotspots.slice(0, 10).map((h) => {
    const fn = h.functionName.slice(0, 38).padEnd(40);
    const bar = '█'.repeat(Math.round(h.percentage / 5));
    return `${fn} ${String(h.samples).padEnd(10)} ${chalk.yellow(bar)} ${h.percentage.toFixed(1)}%`;
  });
  return [header, '-'.repeat(65), ...rows].join('\n');
}

export function formatCorrelations(corrs: Correlation[]): string {
  if (!corrs.length) return chalk.dim('  No correlated LLM calls found.');
  return corrs.map((c) => {
    const cost = `$${c.cost.toFixed(4)}`;
    return `  ${chalk.cyan(c.model)} — ${c.durationMs}ms — ${chalk.green(cost)} [${c.traceId.slice(0, 8)}]`;
  }).join('\n');
}

export const profileReportCommand = new Command('report')
  .description('Show detailed profile report with correlations')
  .argument('<session-id>', 'Profile session ID')
  .option('-e, --endpoint <url>', 'API endpoint', 'http://localhost:3042')
  .option('-k, --api-key <key>', 'API key')
  .action(async (sessionId: string, opts) => {
    const headers: Record<string, string> = {};
    if (opts.apiKey) headers['x-flusk-api-key'] = opts.apiKey;

    const profileRes = await request(
      `${opts.endpoint}/v1/profiles/${sessionId}`, { headers },
    );
    const profile = (await profileRes.body.json()) as Record<string, unknown>;

    if (profile.error) {
      console.error(chalk.red(`Error: ${profile.error}`));
      return;
    }

    console.log(chalk.blue(`\n🔥 Profile: ${chalk.bold(profile.name)}`));
    console.log(chalk.dim(`   Type: ${profile.type} | Duration: ${profile.durationMs}ms | Samples: ${profile.totalSamples}\n`));
    console.log(chalk.bold('Hotspots'));
    console.log(formatHotspots(profile.hotspots || []));

    const corrRes = await request(
      `${opts.endpoint}/v1/profiles/${sessionId}/correlations`, { headers },
    );
    const report = (await corrRes.body.json()) as ReportData;

    console.log(chalk.bold('\n🔗 Correlated LLM Calls'));
    console.log(formatCorrelations(report.correlations));

    if (report.suggestions?.length) {
      console.log(chalk.bold('\n💡 Suggestions'));
      report.suggestions.forEach((s) => console.log(`  • ${s}`));
    }
    console.log('');
  });
