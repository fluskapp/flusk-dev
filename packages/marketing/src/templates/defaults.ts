/**
 * Default templates for social media posts.
 */

export const X_TEMPLATE =
  '🚀 Flusk v{version} — {headline}. {key_feature}. ' +
  'Try it: npx @flusk/cli analyze ./app.js ' +
  '#opensource #devtools #LLM';

export const LINKEDIN_TEMPLATE = `We're excited to announce Flusk v{version}! 🎉

{headline}

Key highlights:
{features_list}

Flusk is an open-source LLM cost optimization platform that helps \
developers reduce AI API costs with zero setup. One command gives you \
actionable insights into your LLM usage patterns.

Try it today:
npx @flusk/cli analyze ./app.js

#OpenSource #DevTools #LLM #AI #CostOptimization`;

export const REDDIT_TEMPLATE = `# Flusk v{version} Released

Hey folks, just released v{version} of Flusk — an open-source LLM cost \
optimization tool.

## What's new
{features_list}

## Bug fixes
{fixes_list}

## What is Flusk?
CLI tool that instruments your LLM API calls via OpenTelemetry, detects \
patterns (duplicate prompts, overqualified models), and suggests cost \
savings. Zero config needed.

\`\`\`bash
npx @flusk/cli analyze ./app.js
\`\`\`

Repo: https://github.com/AdiRishi/flusk
Feedback welcome — especially on the detection heuristics.`;
