# Flusk

LLM cost observability and optimization for Node.js. Auto-instruments
OpenAI, Anthropic, and Bedrock via OpenTelemetry — zero code changes.
Tracks every call, detects waste, suggests fixes.

**Who it's for:** Backend engineers running LLM-powered Node.js apps who
want to understand and reduce API costs without changing application code.

**Why:** LLM APIs are expensive and opaque. You don't know which calls are
wasteful until you measure. Flusk auto-instruments via OTel, tracks
everything, detects patterns (duplicate prompts, overqualified models),
and generates code fixes.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/adirbenyossef/flusk-dev/ci.yml?branch=main)](https://github.com/adirbenyossef/flusk-dev/actions)
[![npm](https://img.shields.io/npm/v/@flusk/otel.svg)](https://www.npmjs.com/package/@flusk/otel)

## Quick Start

```bash
git clone https://github.com/adirbenyossef/flusk-dev.git
cd flusk-dev && cp .env.example .env
docker compose up -d   # PostgreSQL + Redis + Flusk on :3000
```

Install the OTel package in your app:

```bash
npm install @flusk/otel
```

```bash
export FLUSK_ENDPOINT=http://localhost:3000
node --import @flusk/otel ./index.js
```

Every OpenAI, Anthropic, and Bedrock call is now tracked automatically.

## Architecture

```
Your App (unchanged)
  │ node --import @flusk/otel
  ▼
┌──────────────────────────────────────┐
│  Flusk Server (Fastify)              │
│  OTLP Ingestion → Pattern Detection │
│  Model Routing  → Code Generation   │
│  Performance Profiling (flame)       │
│         PostgreSQL + Redis           │
└──────────────────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `@flusk/otel` | Zero-touch OTel auto-instrumentation |
| `@flusk/sdk` | Programmatic API client (routing, prompts, tracing) |
| `@flusk/entities` | TypeBox schemas — single source of truth |
| `@flusk/types` | Derived TS types (Insert, Update, Query) |
| `@flusk/business-logic` | Pure functions, no I/O |
| `@flusk/resources` | DB repositories, migrations, Redis cache |
| `@flusk/execution` | Fastify app: routes, plugins, OTLP ingestion |
| `@flusk/cli` | Code generators, validators, project scaffolding |
| `@flusk/logger` | Structured logging (Pino) |

## Entities

base, llm-call, pattern, conversion, model-performance, routing-rule,
routing-decision, trace, span, optimization, prompt-template,
prompt-version, profile-session, performance-pattern

## Generators

The CLI scaffolds code across all packages:

```bash
pnpm tsx packages/cli/bin/flusk.ts g <entity-file>
```

Available generators: entity-schema, types, resources, business-logic,
execution, feature, feature-test, route, plugin, middleware, service,
fastify-plugin, otel-hook, detector, profile, provider, package,
infrastructure, docker-compose, dockerfile, entrypoint, env, swagger,
watt, test, barrel-updater

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLUSK_ENDPOINT` | `https://otel.flusk.dev` | Flusk server URL |
| `FLUSK_API_KEY` | — | API key (optional for local) |
| `FLUSK_PROJECT_NAME` | `default` | Project name |
| `FLUSK_CAPTURE_CONTENT` | `true` | Capture prompt/response |
| `FLUSK_LOG_LEVEL` | `info` | Log level |
| `FLUSK_PROFILE_MODE` | `auto` | Profiling: auto/manual/off |

## Supported Providers

OpenAI, Anthropic, AWS Bedrock — all auto-detected via OTel.

## Performance Profiling

```bash
flusk g:profile           # scaffold config
flusk profile run ./dist/index.js --duration 60
flusk profile analyze ./profiles/cpu.md
```

## Examples

- [`examples/openai-node/`](./examples/openai-node/)
- [`examples/anthropic-node/`](./examples/anthropic-node/)
- [`examples/bedrock-node/`](./examples/bedrock-node/)

## Docs

- [Getting Started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [SDK Reference](./docs/sdk-reference.md)
- [Self-Hosting](./docs/self-hosting.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](LICENSE) © Adir Ben Yossef 2026
