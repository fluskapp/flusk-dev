# Flusk - Quick Start Guide

## What is Flusk?

Flusk is an LLM API optimization platform that helps reduce AI costs by converting wasteful API calls into deterministic automation. It tracks your LLM usage, detects patterns, and suggests cost-saving optimizations like caching and model downgrading.

---

## Installation

```bash
# Install dependencies
cd /Users/user/projects/flusk
pnpm install

# Build CLI
cd packages/cli
pnpm build
cd ../..
```

---

## Generate Code from Entities

The Flusk CLI generates all code layers from entity schemas automatically:

```bash
# Generate from a single entity
node packages/cli/dist/bin/flusk.js g llm-call.entity.ts

# Generate from all entities
node packages/cli/dist/bin/flusk.js g --all

# Generate types only (fast preview)
node packages/cli/dist/bin/flusk.js g pattern.entity.ts --types-only
```

**What gets generated:**
- TypeScript types and JSON schemas
- Repository CRUD operations
- Database migrations
- Business logic function stubs
- REST API routes
- Fastify plugins
- Lifecycle hooks

All files are <100 lines with @generated headers.

---

## Development

### Setup Database

```bash
# Start PostgreSQL and Redis (Docker)
docker-compose up -d

# Run migrations
pnpm migrate
```

### Start Development Server

```bash
# Terminal 1: Start Flusk server
pnpm start

# Server runs at http://localhost:3000
```

### Run Example

```bash
# Terminal 2: Run AI agent example
pnpm example

# You'll see:
# - LLM calls being tracked
# - Pattern detection triggered
# - Automation suggestions with cost savings
```

---

## Deploy to Production

### Vercel Deployment (Recommended)

```bash
# Setup environment variables
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add ENCRYPTION_KEY

# Deploy
vercel --prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## Using the SDK

### Install in Your AI Agent

```bash
npm install @flusk/sdk
```

### Track LLM Calls

```typescript
import { FluskClient, wrapOpenAI } from '@flusk/sdk'
import OpenAI from 'openai'

// Initialize Flusk
const flusk = new FluskClient({
  apiKey: 'your_org_key',
  baseUrl: 'http://localhost:3000'
})

// Wrap OpenAI client (auto-tracks all calls)
const openai = wrapOpenAI(new OpenAI(), flusk)

// Use OpenAI normally - Flusk tracks automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

### Get Optimization Suggestions

```typescript
// Get cost-saving suggestions
const suggestions = await flusk.getSuggestions()

// Returns:
// - Cache rules: "Cache this prompt for 3 hours, save $223/month"
// - Downgrades: "Use gpt-4o-mini instead, save $171/month"
```

---

## Project Structure

```
flusk/
├── docs/                      # All documentation
│   ├── QUICKSTART.md          # This file
│   ├── FINAL_STATUS.md        # Complete status report
│   ├── CLI_USAGE.md           # CLI reference
│   ├── DEPLOYMENT.md          # Deployment guide
│   └── SECURITY.md            # Security & compliance
│
├── packages/
│   ├── entities/              # Schema definitions (SOURCE OF TRUTH)
│   ├── types/                 # Generated TypeScript types
│   ├── resources/             # Repositories, clients, migrations
│   ├── business-logic/        # Pure functions (no I/O)
│   ├── execution/             # Routes, plugins, hooks
│   ├── sdk/                   # Customer SDKs (Node.js)
│   └── cli/                   # Code generator
│
├── examples/                  # Example AI agent
├── tests/                     # E2E tests
└── api/                       # Vercel serverless entry
```

---

## Key Features

### ✅ Automatic Tracking
- Zero configuration needed
- Wraps existing OpenAI/Anthropic clients
- Non-blocking (failures don't affect your app)

### ✅ Smart Pattern Detection
- Groups calls by prompt hash
- Calculates frequency and cost
- Identifies automation opportunities

### ✅ Cost-Saving Suggestions
- **Caching:** Optimal TTL based on frequency
- **Model downgrading:** Cheaper alternatives (gpt-4 → gpt-4o-mini)
- **Accurate savings:** Real cost calculations

### ✅ Production Ready
- GDPR compliant (encryption, deletion, export)
- SOC2 compliant (audit logs, access controls)
- Vercel deployment ready
- Full error handling
- API key authentication

---

## CLI Commands

```bash
# Code generation
flusk g entity.entity.ts        # Generate all layers
flusk g --all                   # All entities
flusk g --types-only            # Types only

# Database
flusk migrate                   # Run migrations

# Help
flusk --help                    # Show all commands
flusk g --help                  # Command-specific help
```

See [CLI_USAGE.md](./CLI_USAGE.md) for complete reference.

---

## Architecture Principles

1. **Schema-first:** TypeBox definitions generate everything
2. **Pure business logic:** Functions have no side effects
3. **Resources = I/O only:** All DB/API calls isolated
4. **100-line limit:** One function per file
5. **CLI-first:** Generated code from entities

---

## API Endpoints

### LLM Call Tracking
- `POST /api/v1/llm-calls` - Track new call
- `GET /api/v1/llm-calls` - List calls
- `GET /api/v1/llm-calls/:id` - Get call details

### Pattern Detection
- `GET /api/v1/patterns` - List detected patterns
- `GET /api/v1/patterns/:id` - Pattern details

### Optimization Suggestions
- `GET /api/v1/conversions/suggestions/:orgId` - Get suggestions
- `POST /api/v1/conversions/:id/accept` - Accept suggestion

### GDPR Compliance
- `DELETE /api/v1/gdpr/user/:userId` - Delete user data
- `GET /api/v1/gdpr/export/:userId` - Export user data
- `POST /api/v1/gdpr/consent` - Record consent

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Database + Redis check

---

## Example Savings

**Pattern:** "What is 2+2?" (gpt-4)
- Occurrences: 150/month
- Current cost: $7.50/month
- **Cache suggestion:** Save $223.50/month

**Pattern:** Complex queries (gpt-4)
- Current cost: $0.06/call
- **Downgrade to gpt-4o-mini:** $0.003/call (95% cheaper)
- **Savings:** $171/month

**Total potential savings: $394.50/month**

---

## Documentation

- **[FINAL_STATUS.md](./FINAL_STATUS.md)** - Complete project status
- **[CLI_USAGE.md](./CLI_USAGE.md)** - CLI usage guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[SECURITY.md](./SECURITY.md)** - Security controls
- **[COMPLIANCE.md](./COMPLIANCE.md)** - GDPR/SOC2 guide

---

## Support

- Issues: https://github.com/yourorg/flusk/issues
- Docs: `/Users/user/projects/flusk/docs/`

---

## Next Steps

1. ✅ Generate code: `flusk g --all`
2. ✅ Start server: `pnpm start`
3. ✅ Run example: `pnpm example`
4. ✅ Deploy: `vercel --prod`

**Your AI agents can now automatically suggest cost-saving automation! 🎉**
