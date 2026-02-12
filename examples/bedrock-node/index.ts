/**
 * AWS Bedrock + Flusk — zero-touch cost tracking
 *
 * Run: node --import @flusk/otel index.js
 * Your code stays exactly the same. Flusk captures everything via OTel.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const response = await client.send(
  new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'What is LLM cost optimization?' }],
    }),
  }),
);

const body = JSON.parse(new TextDecoder().decode(response.body));
console.log(body.content[0].text);
// Flusk captures: model, tokens, cost, latency — automatically ✨
