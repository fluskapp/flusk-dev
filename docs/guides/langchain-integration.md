# LangChain Integration Guide

Flusk works with LangChain out of the box via OpenTelemetry auto-instrumentation.
No code changes required — just prefix your command with `flusk analyze`.

## Quick Start

```bash
# Analyze a LangChain script
npx @flusk/cli analyze ./my-langchain-app.ts
```

Flusk automatically intercepts OpenAI/Anthropic calls made by LangChain.

## Using the Callback Adapter

For finer control, use the Flusk LangChain callback handler:

```typescript
import { FluskCallbackHandler } from '@flusk/integrations/langchain';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({ modelName: 'gpt-4o' });
const flusk = new FluskCallbackHandler({ agent: 'my-chain' });

const result = await model.invoke('Hello', { callbacks: [flusk] });
```

## With Chains and Agents

```typescript
import { FluskCallbackHandler } from '@flusk/integrations/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

const flusk = new FluskCallbackHandler({ agent: 'qa-chain' });

const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate('Answer: {question}'),
  new ChatOpenAI({ modelName: 'gpt-4o' }),
]);

await chain.invoke({ question: 'What is Flusk?' }, { callbacks: [flusk] });
```

## What Gets Tracked

- Model name, provider, token counts
- Cost per call and cumulative cost
- Prompt/completion text (disable with `--redact`)
- Chain/agent hierarchy via OTel trace context
