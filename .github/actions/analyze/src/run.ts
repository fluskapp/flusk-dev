// --- BEGIN CUSTOM ---
/**
 * CUSTOM action logic for Flusk Analyze GitHub Action.
 * Runs `flusk analyze` and posts a PR comment with cost breakdown.
 */
import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'node:child_process';
import type { AnalyzeInputs, AnalyzeOutputs } from './types.js';

interface AnalyzeResult {
  totalCost: number;
  totalCalls: number;
  models: string[];
  duration: number;
}

interface Insight {
  title: string;
  saving: string;
  detail: string;
}

export async function runAnalyze(inputs: AnalyzeInputs): Promise<AnalyzeOutputs> {
  const env = inputs.token ? { ...process.env, LLM_API_KEY: inputs.token } : process.env;

  // Run flusk analyze
  const analyzeRaw = execSync(
    `npx @flusk/cli analyze ${inputs.script} --provider ${inputs.provider} --format json`,
    { encoding: 'utf-8', env, timeout: 120_000 },
  );
  const analysis: AnalyzeResult = JSON.parse(analyzeRaw);

  // Optionally run explain
  let insights: Insight[] = [];
  if (inputs.explain === 'true') {
    try {
      const explainRaw = execSync(
        `npx @flusk/cli explain --provider ${inputs.explainProvider} --format json`,
        { encoding: 'utf-8', env, timeout: 120_000 },
      );
      insights = JSON.parse(explainRaw);
    } catch (e) {
      core.warning(`Explain failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Build comment body
  const budget = inputs.budget ? parseFloat(inputs.budget) : null;
  const overBudget = budget !== null && analysis.totalCost > budget;

  let body = `## ⚡ Flusk Cost Analysis\n\n`;
  body += `| Metric | Value |\n|--------|-------|\n`;
  body += `| Total LLM Calls | ${analysis.totalCalls} |\n`;
  body += `| Total Cost | $${analysis.totalCost.toFixed(2)} |\n`;
  body += `| Models Used | ${analysis.models.join(', ')} |\n`;
  body += `| Duration | ${analysis.duration.toFixed(1)}s |\n`;

  if (overBudget) {
    body += `\n> ⚠️ **Budget exceeded!** Cost \$${analysis.totalCost.toFixed(2)} exceeds threshold \$${budget!.toFixed(2)}\n`;
  }

  if (insights.length > 0) {
    const top = insights[0];
    body += `\n### 💡 Top Optimization\n**${top.title}**\n${top.saving} — ${top.detail}\n`;
  }

  body += `\n---\n*Powered by [Flusk](https://github.com/adirbenyossef/flusk-dev) — LLM cost optimization*\n`;

  // Post PR comment
  const token = process.env.GITHUB_TOKEN || inputs.token;
  if (token && github.context.payload.pull_request) {
    const octokit = github.getOctokit(token);
    await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.payload.pull_request.number,
      body,
    });
  } else {
    core.info('No PR context or token — printing comment to log');
    core.info(body);
  }

  return {
    totalCost: String(analysis.totalCost),
    totalCalls: String(analysis.totalCalls),
    insightsJson: JSON.stringify(insights),
  };
}
// --- END CUSTOM ---
