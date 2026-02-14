/**
 * Report generator — formats analyze session data into markdown/JSON
 */
import chalk from 'chalk';
import type { LLMCallEntity, AnalyzeSessionEntity } from '@flusk/entities';

export interface ReportData {
  session: AnalyzeSessionEntity;
  calls: LLMCallEntity[];
}

export interface ReportOptions {
  format: 'markdown' | 'json';
  color: boolean;
}

export function generateReport(data: ReportData, opts: ReportOptions): string {
  if (opts.format === 'json') return JSON.stringify(data, null, 2);
  return generateMarkdownReport(data, opts.color);
}

interface ModelSummary {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
}

function groupByModel(calls: LLMCallEntity[]): ModelSummary[] {
  const map = new Map<string, ModelSummary>();
  for (const c of calls) {
    const existing = map.get(c.model) ?? { model: c.model, calls: 0, tokens: 0, cost: 0 };
    existing.calls++;
    existing.tokens += c.tokens.total;
    existing.cost += c.cost;
    map.set(c.model, existing);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

function findDuplicates(calls: LLMCallEntity[]) {
  const hashMap = new Map<string, LLMCallEntity[]>();
  for (const c of calls) {
    const group = hashMap.get(c.promptHash) ?? [];
    group.push(c);
    hashMap.set(c.promptHash, group);
  }
  return [...hashMap.entries()]
    .filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function truncate(s: string, max = 50): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function generateMarkdownReport(data: ReportData, color: boolean): string {
  const { session, calls } = data;
  const identity = (s: string) => s;
  const bold = color ? chalk.bold : identity;
  const cyan = color ? chalk.bold.cyan : identity;
  const yellow = color ? chalk.bold.yellow : identity;
  const green = color ? chalk.bold.green : identity;
  const models = groupByModel(calls);
  const totalCost = calls.reduce((s, call) => s + call.cost, 0);
  const totalTokens = calls.reduce((s, call) => s + call.tokens.total, 0);
  const dupes = findDuplicates(calls);
  const lines: string[] = [];

  lines.push(cyan('# Flusk Analysis Report'));
  lines.push('');
  lines.push(`${bold('Script')}: ${session.script}`);
  lines.push(`${bold('Duration')}: ${Math.round(session.durationMs / 1000)}s`);
  lines.push(`${bold('Date')}: ${session.startedAt}`);
  lines.push('');
  lines.push(yellow('## Cost Summary'));
  lines.push('| Model | Calls | Tokens | Cost |');
  lines.push('|-------|-------|--------|------|');
  for (const m of models) {
    lines.push(`| ${m.model} | ${m.calls} | ${fmt(m.tokens)} | ${usd(m.cost)} |`);
  }
  lines.push(`| ${bold('Total')} | ${bold(String(calls.length))} | ${bold(fmt(totalTokens))} | ${bold(usd(totalCost))} |`);

  if (calls.length > 0) {
    lines.push('');
    lines.push(yellow('## Top Expensive Calls'));
    const top = [...calls].sort((a, b) => b.cost - a.cost).slice(0, 5);
    top.forEach((call, i) => {
      lines.push(`${i + 1}. \`${call.model}\` — "${truncate(call.prompt)}" — ${usd(call.cost)}`);
    });
  }

  if (dupes.length > 0) {
    const dupeCost = dupes.reduce((s, [, g]) => s + (g.length - 1) * g[0].cost, 0);
    const dupeCount = dupes.reduce((s, [, g]) => s + g.length, 0);
    const pct = calls.length > 0 ? ((dupeCount / calls.length) * 100).toFixed(0) : '0';
    lines.push('');
    lines.push(yellow('## Duplicate Prompts Detected'));
    lines.push(`⚠️  Found ${dupeCount} duplicate prompts (${pct}% of total calls)`);
    for (const [, group] of dupes.slice(0, 5)) {
      lines.push(`- "${truncate(group[0].prompt)}" sent ${group.length} times → save ${usd((group.length - 1) * group[0].cost)}`);
    }
    lines.push('');
    lines.push(green(`## Total Potential Savings: ${usd(dupeCost)}/run (${totalCost > 0 ? ((dupeCost / totalCost) * 100).toFixed(1) : '0'}%)`));
  }

  return lines.join('\n');
}
