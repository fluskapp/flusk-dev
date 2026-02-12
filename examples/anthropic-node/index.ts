/**
 * Anthropic + Flusk — zero-touch cost tracking
 *
 * Run: node --import @flusk/otel index.js
 * Your code stays exactly the same. Flusk captures everything via OTel.
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'What is LLM cost optimization?' }],
});

console.log(message.content[0]);
// Flusk captures: model, tokens, cost, latency — automatically ✨
