# CLI Reference

## flusk analyze

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

## flusk report

View or regenerate an analysis report.

```bash
flusk report [session-id]
```

Without an ID, shows the most recent report.

## flusk history

List past analysis sessions.

```bash
flusk history
```

## flusk budget

Check budget status against configured limits.

```bash
flusk budget
```

## flusk init

Create a `.flusk.config.js` configuration file.

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

## Server API

When running in server mode, the Flusk server exposes a REST API.
See [Self-Hosting](./self-hosting.md) for setup.

### Key endpoints

- `POST /v1/traces` — OTLP trace ingestion
- `GET /api/v1/llm-calls/:id` — Get LLM call by ID
- `GET /api/v1/patterns` — List detected patterns
- `GET /api/v1/optimizations/:orgId` — List optimizations
- `GET /health` — Health check
