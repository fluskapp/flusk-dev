/**
 * Flusk E2E Demo — Real LLM cost tracking with Grafana Cloud
 * 
 * Shows: auto-instrumentation, cost calculation, duplicate detection,
 * multi-exporter (SQLite + Grafana Cloud OTLP)
 */
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Flusk E2E Demo — Real Anthropic API Calls');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log();

const calls = [
  { model: 'claude-sonnet-4-20250514', prompt: 'What is the capital of France? One sentence.' },
  { model: 'claude-sonnet-4-20250514', prompt: 'Explain quantum computing in one sentence.' },
  { model: 'claude-3-5-haiku-20241022', prompt: 'What is 2+2? Just the number.' },
  { model: 'claude-3-5-haiku-20241022', prompt: 'Write a haiku about AI costs.' },
  { model: 'claude-sonnet-4-20250514', prompt: 'What is the capital of France? One sentence.' }, // duplicate!
  { model: 'claude-3-5-haiku-20241022', prompt: 'Translate "hello world" to French. Just the translation.' },
];

for (let i = 0; i < calls.length; i++) {
  const { model, prompt } = calls[i];
  const short = model.includes('haiku') ? 'haiku-3.5' : 'sonnet-4';
  console.log(`[${i + 1}/${calls.length}] ${short}: "${prompt.slice(0, 50)}"`);
  
  const res = await client.messages.create({
    model,
    max_tokens: 60,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = res.content[0].type === 'text' ? res.content[0].text : '';
  console.log(`  → ${text.slice(0, 70)}`);
  console.log(`  tokens: ${res.usage.input_tokens}in/${res.usage.output_tokens}out`);
  console.log();
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Done! Spans exported to SQLite + Grafana');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
