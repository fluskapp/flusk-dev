import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-test' });

try {
  const res = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Say hello in 3 words' }],
  });
  console.log(res.choices[0].message.content);
} catch (e) {
  console.log('API call failed (expected with test key):', e.message);
}
