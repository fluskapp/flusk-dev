/**
 * Run the explain analysis pipeline.
 * Reads LLM call data, sends to LLM for analysis, stores insights.
 */

// --- BEGIN CUSTOM ---
import type { DatabaseSync } from 'node:sqlite';
import type { InsightEntity } from '@flusk/entities';
import { renderExplainSystem } from '../llm-call/prompts/explain-system.prompt.js';
import { SqliteInsightRepo, SqliteExplainSessionRepo } from '@flusk/resources';

export interface RunExplainOptions {
  db: DatabaseSync;
  provider: string;
  model?: string;
  maxInsights: number;
  minSeverity: string;
  sessionId?: string;
  noCode: boolean;
  callLlm: (prompt: string, provider: string) => Promise<LlmResponse>;
}

export interface LlmResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

export interface ExplainResult {
  insights: InsightEntity[];
  sessionId: string;
  totalSavings: number;
}

export async function runExplain(opts: RunExplainOptions): Promise<ExplainResult> {
  const { db, provider, maxInsights, callLlm } = opts;

  // Aggregate usage data from llm_calls
  const costRow = db.prepare('SELECT COALESCE(SUM(cost),0) as total FROM llm_calls').get() as Record<string, unknown>;
  const modelRows = db.prepare(
    'SELECT model, COUNT(*) as cnt, SUM(cost) as cost FROM llm_calls GROUP BY model ORDER BY cost DESC',
  ).all() as Record<string, unknown>[];
  const dupRow = db.prepare(
    'SELECT COALESCE(SUM(c),0) as total FROM (SELECT COUNT(*) as c FROM llm_calls GROUP BY prompt_hash HAVING c > 1)',
  ).get() as Record<string, unknown>;

  const usageData = [
    `Total cost: $${(costRow.total as number).toFixed(4)}`,
    `Models: ${modelRows.map(r => `${r.model}(${r.cnt} calls, $${(r.cost as number).toFixed(4)})`).join(', ')}`,
    `Duplicate prompts: ${dupRow.total}`,
  ].join('\n');

  const prompt = renderExplainSystem({
    pricingTable: 'See provider documentation for current pricing.',
    usageData,
    patterns: `${modelRows.length} models in use, ${dupRow.total} duplicate prompts detected`,
  });

  const response = await callLlm(prompt, provider);
  const insights = parseInsights(response.content, maxInsights);

  // Store explain session
  const totalSavings = insights.reduce((s, i) => s + (i.currentCost - i.projectedCost), 0);
  const session = SqliteExplainSessionRepo.create(db, {
    analyzeSessionId: opts.sessionId ?? 'latest',
    llmProvider: provider,
    llmModel: response.model,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    explainCost: 0,
    insightsCount: insights.length,
    totalSavings,
  });

  // Store each insight
  const stored = insights.map(i => SqliteInsightRepo.create(db, { ...i, sessionId: session.id }));

  return { insights: stored, sessionId: session.id, totalSavings };
}

function parseInsights(
  content: string, max: number,
): Omit<InsightEntity, 'id' | 'createdAt' | 'updatedAt' | 'sessionId'>[] {
  try {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : parsed.insights ?? [];
    return arr.slice(0, max);
  } catch {
    return [];
  }
}
// --- END CUSTOM ---
