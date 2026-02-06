# @flusk/sdk

Official Node.js SDK for Flusk - AI agent instrumentation and LLM API optimization platform.

## Installation

```bash
npm install @flusk/sdk
```

## Quick Start

### OpenAI Integration

```typescript
import { FluskClient, wrapOpenAI } from '@flusk/sdk'
import OpenAI from 'openai'

// Initialize Flusk client
const flusk = new FluskClient({
  apiKey: 'flusk_xxx',
  baseUrl: 'http://localhost:3000', // Optional, defaults to https://api.flusk.ai
})

// Wrap your OpenAI client
const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), flusk)

// Use OpenAI as normal - calls are automatically tracked
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})

console.log(response.choices[0]?.message?.content)
```

### Anthropic Integration

```typescript
import { FluskClient, wrapAnthropic } from '@flusk/sdk'
import Anthropic from '@anthropic-ai/sdk'

const flusk = new FluskClient({ apiKey: 'flusk_xxx' })
const anthropic = wrapAnthropic(
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  flusk
)

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
})

console.log(response.content[0]?.text)
```

## Getting Conversion Suggestions

Flusk analyzes your LLM usage patterns and suggests optimizations:

```typescript
const suggestions = await flusk.getSuggestions()

suggestions.forEach((s) => {
  console.log(`Pattern: ${s.callSignature}`)
  console.log(`Frequency: ${s.frequency} calls`)
  console.log(`Potential savings: $${s.potentialSavings}`)
  console.log(`Suggested automation: ${s.suggestedAutomation}`)
})
```

## Manual Tracking

You can also manually track LLM calls:

```typescript
await flusk.track({
  provider: 'openai',
  model: 'gpt-4o',
  prompt: 'What is 2+2?',
  response: '4',
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  cost: 0.00015,
  latencyMs: 250,
  metadata: {
    temperature: 0.7,
  },
})
```

## API Reference

### FluskClient

#### Constructor

```typescript
new FluskClient(config: FluskClientConfig)
```

- `config.apiKey` (required): Your Flusk API key
- `config.baseUrl` (optional): Base URL for Flusk API (defaults to `https://api.flusk.ai`)

#### Methods

##### `track(llmCall: LLMCallData): Promise<void>`

Track an LLM API call for analysis.

##### `getSuggestions(organizationId?: string): Promise<ConversionSuggestion[]>`

Get conversion suggestions for optimizing LLM usage.

### Wrappers

#### `wrapOpenAI(openai: OpenAI, flusk: FluskClient): OpenAI`

Wraps an OpenAI client to automatically track all chat completion calls.

#### `wrapAnthropic(anthropic: Anthropic, flusk: FluskClient): Anthropic`

Wraps an Anthropic client to automatically track all message creation calls.

## Features

- ✅ **Automatic tracking** - Transparent instrumentation of LLM calls
- ✅ **Cost calculation** - Automatic cost tracking based on token usage
- ✅ **Error handling** - Tracks failed calls for analysis
- ✅ **Non-blocking** - Tracking failures don't affect your application
- ✅ **TypeScript** - Full type safety and autocompletion
- ✅ **ESM** - Modern ECMAScript modules

## License

MIT
