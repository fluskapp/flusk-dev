import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'sk-mock-test-key',
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:18923/v1',
});

// Make a few different calls to show variety in the report
const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4'];
const prompts = [
  'What is the capital of France?',
  'Explain quantum computing in one sentence',
  'What is 2+2?',
  'Write a haiku about programming',
  'What is the capital of France?',  // duplicate prompt for dedup detection
];

for (let i = 0; i < prompts.length; i++) {
  const model = models[i % models.length];
  console.log(`[${i+1}/${prompts.length}] Calling ${model}...`);
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompts[i] }],
  });
  console.log(`  → ${res.choices[0].message.content.slice(0, 50)}...`);
}

console.log('Done!');
