/**
 * Format insight results for CLI output.
 */

// --- BEGIN CUSTOM ---
import type { InsightEntity } from '@flusk/entities';

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴', high: '🟠', medium: '🟡', low: '🟢',
};

export function formatInsights(
  insights: InsightEntity[],
  format: 'text' | 'json' | 'markdown',
  noCode = false,
): string {
  if (format === 'json') return JSON.stringify(insights, null, 2);
  if (format === 'markdown') return formatMarkdown(insights, noCode);
  return formatText(insights, noCode);
}

function formatText(insights: InsightEntity[], noCode: boolean): string {
  if (insights.length === 0) return '✅ No optimization insights found.';
  const sorted = [...insights].sort((a, b) => b.savingsPercent - a.savingsPercent);
  const lines = sorted.map((i, idx) => {
    const emoji = SEVERITY_EMOJI[i.severity] ?? '⚪';
    const parts = [
      `${idx + 1}. ${emoji} [${i.severity.toUpperCase()}] ${i.title}`,
      `   ${i.description}`,
      `   💰 $${i.currentCost.toFixed(4)} → $${i.projectedCost.toFixed(4)} (${i.savingsPercent.toFixed(1)}% savings)`,
      `   Provider: ${i.provider} | Model: ${i.model}`,
    ];
    if (!noCode && i.codeSuggestion) parts.push(`   Code: ${i.codeSuggestion}`);
    return parts.join('\n');
  });
  return `\n🔍 Flusk Explain — ${insights.length} insights\n\n${lines.join('\n\n')}\n`;
}

function formatMarkdown(insights: InsightEntity[], noCode: boolean): string {
  if (insights.length === 0) return '## No optimization insights found.\n';
  const sorted = [...insights].sort((a, b) => b.savingsPercent - a.savingsPercent);
  const header = '| # | Severity | Title | Current | Projected | Savings |';
  const sep = '|---|----------|-------|---------|-----------|---------|';
  const rows = sorted.map((i, idx) =>
    `| ${idx + 1} | ${i.severity} | ${i.title} | $${i.currentCost.toFixed(4)} | $${i.projectedCost.toFixed(4)} | ${i.savingsPercent.toFixed(1)}% |`,
  );
  let md = `# Flusk Explain Results\n\n${header}\n${sep}\n${rows.join('\n')}\n`;
  if (!noCode) {
    const withCode = sorted.filter(i => i.codeSuggestion);
    if (withCode.length > 0) {
      md += '\n## Code Suggestions\n\n';
      md += withCode.map(i => `### ${i.title}\n\`\`\`\n${i.codeSuggestion}\n\`\`\``).join('\n\n');
    }
  }
  return md;
}
// --- END CUSTOM ---
