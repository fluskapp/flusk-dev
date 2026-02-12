/**
 * OpenAI + Flusk — zero-touch cost tracking
 *
 * Run: node --import @flusk/otel index.js
 * Your code stays exactly the same. Flusk captures everything via OTel.
 */

import OpenAI from 'openai';

const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What is LLM cost optimization?' }],
});

console.log(response.choices[0].message.content);
// Flusk captures: model, tokens, cost, latency — automatically ✨
