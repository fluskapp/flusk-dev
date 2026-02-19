/**
 * Real Anthropic demo — sends actual LLM calls through Flusk OTel
 * with costs exported to Grafana Cloud
 */
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const prompts = [
  'What is the capital of France? Reply in one sentence.',
  'Explain quantum computing in one sentence.',
  'What is 2+2? Just the number.',
  'Write a haiku about programming.',
  'What is the capital of France? Reply in one sentence.', // duplicate for dedup
];

for (let i = 0; i < prompts.length; i++) {
  console.log(`[${i + 1}/${prompts.length}] Calling claude-sonnet-4-20250514...`);
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompts[i] }],
  });
  const text = res.content[0].type === 'text' ? res.content[0].text : '';
  console.log(`  → ${text.slice(0, 80)}`);
  console.log(`  tokens: ${res.usage.input_tokens} in / ${res.usage.output_tokens} out`);
}

console.log('\nDone! Check Grafana for traces.');
