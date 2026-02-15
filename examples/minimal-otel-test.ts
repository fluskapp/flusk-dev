import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import OpenAI from 'openai';

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  resource: new Resource({ 'service.name': 'flusk-test' }),
});
sdk.start();
console.log('SDK started');

const client = new OpenAI({
  apiKey: 'test',
  baseURL: process.env['OPENAI_BASE_URL'] || 'http://localhost:18923/v1',
});

const res = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'hi' }],
});
console.log('Response:', res.choices[0].message.content);

// Give OTel time to export
await new Promise(r => setTimeout(r, 2000));
await sdk.shutdown();
console.log('Done');
