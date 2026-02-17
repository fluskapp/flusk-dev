import { createServer } from 'node:http';
import OpenAI from 'openai';

// Start a mock OpenAI server inline
let requestCount = 0;
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => body += chunk);
  req.on('end', () => {
    requestCount++;
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = {}; }
    const model = parsed.model || 'gpt-4o-mini';
    const prompt = (parsed.messages || []).map(m => m.content).join(' ');
    const promptTokens = 500 + Math.floor(Math.random() * 500);
    const completionTokens = 200 + Math.floor(Math.random() * 300);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: `chatcmpl-mock-${requestCount}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: `Mock response #${requestCount}` },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
    }));
  });
});

await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
console.log(`Mock OpenAI server on port ${port}\n`);

const client = new OpenAI({ apiKey: 'sk-mock', baseURL: `http://127.0.0.1:${port}/v1` });

console.log('Making OpenAI API calls...\n');

const res1 = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What is 2+2? Reply in one word.' }],
});
console.log('GPT-4o-mini:', res1.choices[0].message.content, `(${res1.usage.total_tokens} tokens)`);

const res2 = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What color is the sky? Reply in one word.' }],
});
console.log('GPT-4o:', res2.choices[0].message.content, `(${res2.usage.total_tokens} tokens)`);

const res3 = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What is 2+2? Reply in one word.' }],
});
console.log('GPT-4o-mini (dup):', res3.choices[0].message.content, `(${res3.usage.total_tokens} tokens)`);

server.close();
console.log('\nDone!');
