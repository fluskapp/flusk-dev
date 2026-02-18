/**
 * Handler for the flusk explain command.
 */

// --- BEGIN CUSTOM ---
import { resolve } from 'node:path';
import chalk from 'chalk';
import { getDb, runMigrations } from '@flusk/resources';
import { explain } from '@flusk/business-logic';
import type { ExplainOptions } from './explain.options.js';

const { runExplain, formatInsights } = explain;
type LlmResponse = explain.LlmResponse;

async function callOpenAi(prompt: string, _provider: string): Promise<LlmResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  const json = await res.json() as Record<string, unknown>;
  const choice = (json.choices as Record<string, unknown>[])?.[0];
  const msg = (choice?.message as Record<string, unknown>)?.content as string;
  const usage = json.usage as Record<string, number>;
  return {
    content: msg,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    model: 'gpt-4o-mini',
  };
}

export async function handleExplain(opts: ExplainOptions): Promise<void> {
  const dbPath = resolve(opts.db);
  const db = getDb(dbPath);
  runMigrations(db);

  console.log(chalk.blue('\n🔍 Running flusk explain...\n'));
  const result = await runExplain({
    db, provider: opts.provider, model: opts.model,
    maxInsights: opts.maxInsights, minSeverity: opts.minSeverity,
    sessionId: opts.session, noCode: opts.noCode,
    callLlm: callOpenAi,
  });

  console.log(formatInsights(result.insights, opts.format, opts.noCode));
  console.log(chalk.green(`\n✨ ${result.insights.length} insights saved (session: ${result.sessionId})\n`));
}
// --- END CUSTOM ---
