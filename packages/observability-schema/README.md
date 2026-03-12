# @flusk/observability-schema

YAML schema definitions for the Flusk observability backend. This package is the **single source of truth** for all observability backend code generation via `flusk-lang`.

## Structure

```
schema/
  entities/     (51)  — Database entity definitions
  functions/    (226) — Pure function signatures and logic
  routes/       (39)  — HTTP API route definitions
  commands/     (34)  — CLI command definitions
  events/       (11)  — Domain event definitions
  workers/      (8)   — Background worker definitions
  streams/      (5)   — Real-time stream definitions
  clients/      (6)   — External API client definitions
  providers/    (5)   — Notification provider definitions
  middleware/         — Fastify middleware definitions
  middlewares/        — Additional middleware definitions
  plugins/      (1)   — Fastify plugin definitions
  services/     (1)   — Service definitions

deploy/
  gcp/          — Google Cloud Run, Cloud Build configs
  aws/          — ECS task definition, AppSpec

e2e/
  flows/        — End-to-end test flows (vitest)
```

## Usage

These schemas are consumed by `flusk-lang` to generate the full observability backend. **Never edit generated output directly** — change the YAML here and regenerate.

```bash
# Validate schema references
pnpm validate

# Run schema tests
pnpm test
```

## Schema Types

| Type | Description |
|------|-------------|
| `entity` | Database table definition with fields, indexes, queries |
| `function` | Pure function with inputs, outputs, logic steps |
| `route` | HTTP endpoint with request/response shapes |
| `command` | CLI command with args, flags, handler |
| `event` | Domain event with payload definition |
| `worker` | Background job with schedule and handler |
| `stream` | Real-time data stream (SSE/WebSocket) |
| `client` | External API client with auth and endpoints |
| `provider` | Notification provider (Slack, email, webhook, etc.) |
| `middleware` | Fastify middleware with request/response hooks |
| `plugin` | Fastify plugin registration |
| `service` | Application service definition |
