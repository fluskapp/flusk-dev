/**
 * Main setup wizard orchestrator — 4 steps.
 */

import type { WizardPrompter } from './prompter.js';
import { validateOpenAiKey, validateAnthropicKey } from './validate-api-key.js';
import { generateEnvFile } from './generate-env.js';
import { sendTestSpan, type TraceResult } from './send-test-span.js';
import { execSync } from 'node:child_process';

function formatTrace(t: TraceResult): string {
  const lines = [
    `Model:    ${t.model}`,
    `Tokens:   ${t.tokens.total} (${t.tokens.prompt} in / ${t.tokens.completion} out)`,
    `Latency:  ${t.latencyMs}ms`,
    `Cost:     $${t.estimatedCost.toFixed(6)}`,
    `Cached:   ${t.cached ? '✅ yes' : '❌ no'}`,
    `Response: ${t.response.slice(0, 120)}`,
  ];
  return lines.join('\n');
}

export async function setupWizard(p: WizardPrompter, projectRoot: string): Promise<void> {
  p.intro('🚀 Flusk Setup Wizard');

  // Step 1: Collect API keys
  const openAiKey = await p.text({
    message: 'Enter your OpenAI API key',
    placeholder: 'sk-...',
    validate: (v) => (v.startsWith('sk-') ? undefined : 'Must start with sk-'),
  });

  const spin = p.spinner();
  spin.update('Validating OpenAI key…');
  const oaiResult = await validateOpenAiKey(openAiKey);
  if (!oaiResult.valid) { spin.stop(`❌ Invalid: ${oaiResult.error}`); process.exit(1); }
  spin.stop(`✅ OpenAI key valid (${oaiResult.models.length} GPT models)`);

  const wantAnthropic = await p.confirm({ message: 'Add Anthropic key? (optional)', initialValue: false });
  let anthropicKey: string | undefined;
  if (wantAnthropic) {
    anthropicKey = await p.text({ message: 'Enter your Anthropic API key', placeholder: 'sk-ant-...' });
    spin.update('Validating Anthropic key…');
    const antResult = await validateAnthropicKey(anthropicKey);
    if (!antResult.valid) { spin.stop(`❌ Invalid: ${antResult.error}`); process.exit(1); }
    spin.stop('✅ Anthropic key valid');
  }

  const projectName = await p.text({ message: 'Project name', placeholder: 'my-app' });

  // Write .env
  const envPath = await generateEnvFile(projectRoot, { openAiKey, anthropicKey, projectName });
  p.note(`Written to ${envPath}`, '.env created');

  // Step 2: Start infrastructure
  spin.update('Starting Flusk infrastructure…');
  try {
    execSync('docker compose up -d', { cwd: projectRoot, stdio: 'pipe', timeout: 120_000 });
  } catch (err) {
    spin.stop('❌ docker compose failed'); throw err;
  }
  spin.update('Waiting for services to be healthy…');
  await new Promise((r) => setTimeout(r, 5000));
  spin.stop('✅ Infrastructure running');

  // Step 3: Send test call
  const endpoint = 'http://localhost:4318';
  spin.update('Sending test LLM call through Flusk…');
  const trace1 = await sendTestSpan(openAiKey, endpoint);
  spin.stop('✅ First call complete');
  p.note(formatTrace(trace1), '📊 Trace #1 — Live call');

  // Step 4: Cache demo
  spin.update('Sending same prompt again (cache demo)…');
  const trace2 = await sendTestSpan(openAiKey, endpoint);
  spin.stop('✅ Second call complete');
  p.note(formatTrace(trace2), '📊 Trace #2 — Cache hit');

  if (trace2.cached) {
    const saved = ((trace1.latencyMs - trace2.latencyMs) / trace1.latencyMs * 100).toFixed(0);
    p.note(`Latency: ${trace1.latencyMs}ms → ${trace2.latencyMs}ms (${saved}% faster)\nCost saved: $${trace1.estimatedCost.toFixed(6)}`, '💰 Savings');
  }

  p.note('Dashboard: http://localhost:3000\n\nAdd to your app:\n  npm i @flusk/sdk\n  import { flusk } from "@flusk/sdk"', '🎉 Next steps');
  p.outro('Happy building!');
}
