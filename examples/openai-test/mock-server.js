// Minimal mock OpenAI API server
import { createServer } from 'node:http';

let requestCount = 0;

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      requestCount++;
      const parsed = JSON.parse(body);
      const model = parsed.model || 'gpt-4o-mini';
      const prompt = parsed.messages?.map(m => m.content).join(' ') || '';
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: `chatcmpl-mock-${requestCount}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: `Mock response #${requestCount} for: ${prompt.slice(0, 30)}` },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: Math.floor(prompt.length / 4) + 10,
          completion_tokens: 15,
          total_tokens: Math.floor(prompt.length / 4) + 25,
        },
      }));
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(0, () => {
  const port = server.address().port;
  console.log(`MOCK_PORT=${port}`);
});
