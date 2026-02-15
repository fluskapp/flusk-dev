import { createServer } from 'node:http';

const PORT = process.env.MOCK_PORT || 18923;

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const input = JSON.parse(body);
      const response = {
        id: 'chatcmpl-mock-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: input.model || 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello! This is a mock response from Flusk test server.' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 12, completion_tokens: 15, total_tokens: 27 },
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Mock OpenAI server on port ${PORT}`);
});
