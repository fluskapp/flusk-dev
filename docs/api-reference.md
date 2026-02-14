# CLI Reference

## Analysis & Reporting

### flusk analyze

Run a script and analyze LLM costs.

```bash
flusk analyze <script> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --duration <s>` | `60` | Duration in seconds (0 = until exit) |
| `-o, --output <file>` | stdout | Write report to file |
| `-f, --format <fmt>` | `markdown` | Report format: `markdown` or `json` |
| `-a, --agent <name>` | — | Label for multi-agent tracking |
| `-m, --mode <mode>` | `local` | Export mode: `local` or `server` |

### flusk report

View or regenerate an analysis report.

```bash
flusk report [session-id]
```

Without an ID, shows the most recent report.

### flusk history

List past analysis sessions.

```bash
flusk history
```

### flusk budget

Check budget status against configured limits.

```bash
flusk budget
```

Shows daily/monthly usage with progress bars, per-call threshold violations,
and duplicate ratio alerts.

## Code Generation

### flusk generate entity

Generate entity files from a YAML schema.

```bash
flusk generate entity --from <yaml>
```

Generates:
- `<entity>.entity.ts` — TypeBox schema (→ `@flusk/entities`)
- `<entity>.types.ts` — Insert/Update/Query type variants (→ `@flusk/types`)
- `<entity>.sql` — SQLite CREATE TABLE + indexes (→ `@flusk/resources`)

### flusk recipe

Run a code generation recipe.

```bash
flusk recipe <name> [options]
flusk recipe list          # show all available recipes
```

| Option | Description |
|--------|-------------|
| `--from <path>` | YAML file path (for `full-entity` recipe) |
| `--name <name>` | Name for generated artifact |
| `--description <desc>` | Description text |
| `--package <pkg>` | Target package name |
| `--with-config` | Include config block |
| `--with-decorator` | Include decorator |
| `--dry-run` | Preview without writing files |

**Built-in recipes:**
- `full-entity` — From YAML: entity + types + migration + repo + routes + barrels
- `fastify-plugin` — Generate a Fastify plugin scaffold
- `cli-command` — Generate a CLI command scaffold
- `route` — Generate route handler
- `middleware` — Generate middleware
- `client` — Generate API client
- `otel-hook` — Generate OTel instrumentation hook
- `sdk-provider` — Generate SDK provider
- `logger` — Generate logger instance

## Regeneration & Validation

### flusk regenerate

Incremental regeneration — update generated files when YAML changes,
preserving custom code in CUSTOM regions.

```bash
flusk regenerate [options]
```

| Option | Description |
|--------|-------------|
| `--all` | Regenerate everything regardless of staleness |
| `--dry-run` | Show what would change without writing |

### flusk validate-generated

CI command — check that all generated files match their source YAML hashes.

```bash
flusk validate-generated [options]
```

| Option | Description |
|--------|-------------|
| `--strict` | Exit 1 on any stale or tampered files |

### flusk ratio

Report generator coverage ratio across packages.

```bash
flusk ratio [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output machine-readable JSON |

Target: 90% generated code coverage.

### flusk guard

Scan repo for `@generated` header violations — detects when AI agents
or developers add fake `@generated` headers to hand-written files.

```bash
flusk guard
```

Exits with code 1 if violations found. Use in CI.

### flusk status

Overview of generated file health — stale files, custom sections,
per-entity breakdown.

```bash
flusk status
```

## Setup

### flusk init

Create a `.flusk.config.js` configuration file interactively.

```bash
flusk init
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLUSK_MODE` | `local` | `local` (SQLite) or `server` (HTTP) |
| `FLUSK_ENDPOINT` | — | Server URL (implies server mode) |
| `FLUSK_API_KEY` | — | API key for server mode |
| `FLUSK_PROJECT_NAME` | `default` | Project/service name |
| `FLUSK_CAPTURE_CONTENT` | `true` | Capture prompt/response text |
| `FLUSK_AGENT` | — | Agent label for multi-agent tracking |
| `FLUSK_SQLITE_PATH` | `~/.flusk/data.db` | SQLite database path |
| `FLUSK_LOG_LEVEL` | `info` | Log level |

## Server API (server mode only)

When running in server mode, the Flusk server exposes a REST API.
See [Self-Hosting](./self-hosting.md) for setup.

### Key endpoints

- `POST /v1/traces` — OTLP trace ingestion
- `GET /api/v1/llm-calls/:id` — Get LLM call by ID
- `GET /api/v1/patterns` — List detected patterns
- `GET /api/v1/optimizations/:orgId` — List optimizations
- `GET /health` — Health check
