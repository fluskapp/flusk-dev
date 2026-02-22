# Vercel AI SDK Integration Guide

Flusk instruments Vercel AI SDK calls automatically via OTel.
Use `flusk analyze` to capture cost data with zero code changes.

## Quick Start

```bash
npx @flusk/cli analyze ./my-ai-app.ts
```

## Using the Middleware Adapter

For server-side usage with Next.js or other frameworks, use the
Flusk telemetry middleware for Vercel AI SDK:

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { fluskTelemetry } from '@flusk/integrations/vercel-ai';

// Non-streaming
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is Flusk?',
  experimental_telemetry: fluskTelemetry({ agent: 'my-app' }),
});

// Streaming
const result = await streamText({
  model: openai('gpt-4o'),
  prompt: 'Explain OTel',
  experimental_telemetry: fluskTelemetry({ agent: 'my-app' }),
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## Next.js Route Handler

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { fluskTelemetry } from '@flusk/integrations/vercel-ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    experimental_telemetry: fluskTelemetry({ agent: 'chat' }),
  });

  return result.toDataStreamResponse();
}
```

## What Gets Tracked

- Model name, provider, token counts
- Cost per call (streaming and non-streaming)
- Latency and time-to-first-token
- Prompt/completion text (disable with `--redact`)
