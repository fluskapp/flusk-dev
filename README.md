# Flusk Platform

> LLM API optimization infrastructure that helps companies reduce LLM costs by converting wasteful API calls into deterministic automation.

## 📚 Documentation

**→ [Complete documentation in docs/ folder](./docs/)**

### 🚀 Quick Start
- **[Ready for Testing](./docs/READY_FOR_TESTING.md)** - Start here! Everything ready for E2E testing
- **[E2E Testing Guide](./docs/E2E_TESTING_GUIDE.md)** - Test Flusk in 15 minutes
- **[Company User Guide](./docs/COMPANY_USER_GUIDE.md)** - Integrate and save 40-60% on AI costs

### 🛠️ Deployment & Development
- **[Deployment Guide](./docs/DEPLOYMENT_PRODUCTION.md)** - Deploy to Vercel, Docker, AWS, or Railway
- **[CLI Usage](./docs/CLI_USAGE.md)** - Code generation from entities
- **[Quick Start](./docs/QUICKSTART.md)** - 5-minute setup guide

---

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ with pgvector
- Redis 7+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server
pnpm dev
```

### Running the Example

```bash
# Navigate to examples directory
cd examples

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-...

# Run the example
pnpm start
```

## Architecture Overview

Flusk follows a **Composable Monolith** architecture with strict separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Execution Layer                          │
│  (Fastify Routes, Plugins, Middleware, Hooks)               │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                        │
│     (Pure functions - no I/O, side effects)                 │
├─────────────────────────────────────────────────────────────┤
│                    Resource Layer                            │
│  (DB Repositories, API Clients, Cache, Queue)               │
├─────────────────────────────────────────────────────────────┤
│                     Entity Layer                             │
│    (TypeBox Schemas - Source of Truth)                      │
└─────────────────────────────────────────────────────────────┘
```

### Folder Structure

```
packages/
├── entities/        # SOURCE OF TRUTH — Schema definitions (TypeBox)
├── types/           # TypeScript types + JSON Schema (generated)
├── resources/       # DB repositories, API clients (I/O only)
├── business-logic/  # Pure functions (no side effects)
├── execution/       # Routes, plugins, middleware, hooks
├── sdk/             # Customer SDKs (Node.js, Python)
└── cli/             # Flusk CLI (flusk g, flusk migrate)
```

## How It Works

### 1. Track LLM Calls

Wrap your LLM client with the Flusk SDK to automatically track all API calls:

```typescript
import OpenAI from 'openai'
import { FluskClient, wrapOpenAI } from '@flusk/sdk'

const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: 'http://localhost:3000',
})

const openai = wrapOpenAI(new OpenAI(), flusk)

// All calls are now automatically tracked
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

### 2. Detect Patterns

Flusk analyzes your LLM calls to identify:

- **Repeated prompts** → Cache responses
- **Deterministic tasks** → Replace with scripts
- **Template-based calls** → Convert to structured APIs
- **Similar calls** → Use semantic deduplication

### 3. Get Suggestions

Fetch automation suggestions with estimated savings:

```typescript
const suggestions = await flusk.getSuggestions()

suggestions.forEach((s) => {
  console.log(`${s.suggestedAutomation}`)
  console.log(`Potential Savings: $${s.potentialSavings}/month`)
  console.log(`Confidence: ${(s.confidence * 100).toFixed(0)}%`)
})
```

### 4. Implement Automations

Flusk provides configuration to replace expensive LLM calls:

- **Cache**: Store repeated responses
- **Scripts**: Replace deterministic tasks with code
- **Templates**: Convert to structured data extraction
- **Fallback**: Route to cheaper models for simple tasks

## E2E Example Walkthrough

The complete example in `examples/ai-agent-with-flusk.ts` demonstrates:

### Step 1: Setup

```typescript
const flusk = new FluskClient({
  apiKey: 'test_org_key',
  baseUrl: 'http://localhost:3000',
})

const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), flusk)
```

### Step 2: Simulate AI Agent

The example makes 7 LLM calls, including:

- 3 repeated calls to "What is 2+2?" (should trigger cache suggestion)
- 2 repeated calls about "capital of France" (should trigger cache suggestion)
- 2 unique calls (shouldn't trigger automation)

### Step 3: Pattern Analysis

```typescript
await fetch('http://localhost:3000/api/v1/patterns/analyze', {
  method: 'POST',
  headers: { Authorization: 'Bearer test_org_key' },
})
```

### Step 4: View Suggestions

```typescript
const suggestions = await flusk.getSuggestions()

suggestions.forEach((s) => {
  console.log(`Call Pattern: ${s.callSignature}`)
  console.log(`Frequency: ${s.frequency} calls`)
  console.log(`Potential Savings: $${s.potentialSavings}/month`)
})
```

## API Endpoints

### LLM Calls

- `POST /api/v1/llm-calls` - Track an LLM call
- `GET /api/v1/llm-calls/:id` - Get call by ID
- `GET /api/v1/llm-calls/by-hash/:hash` - Get cached response by hash

### Patterns (Coming Soon)

- `POST /api/v1/patterns/analyze` - Trigger pattern analysis
- `GET /api/v1/patterns` - List detected patterns

### Conversions (Coming Soon)

- `GET /api/v1/conversions/suggestions` - Get automation suggestions
- `POST /api/v1/conversions/approve/:id` - Approve a suggestion
- `POST /api/v1/conversions/reject/:id` - Reject a suggestion

## Tech Stack

- **Runtime**: Platformatic Watt 3.37+ with Fastify v5
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis 7 + Streams
- **Schema**: TypeBox → JSON Schema
- **Languages**: TypeScript (Node.js 22+), Python 3.11+ (FastAPI for ML)

## Development

### Code Style

- ESM only, no CommonJS
- Strict TypeScript
- Named exports preferred
- One function per file in business-logic/
- Fastify plugin encapsulation pattern

### Running Tests

```bash
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run unit tests
pnpm test:unit
```

### Database Migrations

```bash
# Run migrations
pnpm migrate

# Create new migration
pnpm migrate:create <name>
```

## Architecture Principles

### 1. Composable Monolith

Single deployment, plugin-based isolation. Each feature is a Fastify plugin that can be independently developed and tested.

### 2. Schema-First

TypeBox definitions in `packages/entities/` are the single source of truth. Everything else is generated:

- TypeScript types
- JSON Schema
- Database migrations
- API documentation

### 3. Pure Business Logic

Functions in `packages/business-logic/` have no side effects:

- Input → Output (deterministic)
- No database calls
- No API calls
- No file I/O
- Easily testable

### 4. Resources = I/O Only

All I/O operations isolated in `packages/resources/`:

- Database repositories
- API clients
- Cache clients
- Queue publishers

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and architecture details.

## License

MIT
