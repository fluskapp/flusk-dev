# @flusk/otel

Zero-touch OpenTelemetry auto-instrumentation for LLM calls.

## Usage

```bash
node --import @flusk/otel ./index.js
```

Or import at the top of your entry file:

```ts
import '@flusk/otel';
```

## Modes

### Local Mode (default)

Exports spans to SQLite (`~/.flusk/data.db`). No server needed.
This is what `flusk analyze` uses.

### Server Mode

Exports spans via OTLP HTTP to a Flusk server. Enabled by setting `FLUSK_ENDPOINT` or `FLUSK_MODE=server`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `FLUSK_MODE` | `local` (SQLite) or `server` (OTLP HTTP) | `local` |
| `FLUSK_API_KEY` | Flusk API key (server mode) | — |
| `FLUSK_ENDPOINT` | OTLP endpoint (server mode) | `https://otel.flusk.dev` |
| `FLUSK_PROJECT_NAME` | Service/project name | `default` |
| `FLUSK_CAPTURE_CONTENT` | Capture prompt/response content | `true` |
| `FLUSK_PROFILE_MODE` | Profiling mode: `auto`, `manual`, `off` | `auto` |

If `FLUSK_ENDPOINT` is set without an explicit `FLUSK_MODE`, server mode is used automatically.

## Performance Profiling (Optional)

Install `@platformatic/flame` for automatic CPU/heap profiling:

```bash
npm install @platformatic/flame
```

`@flusk/otel` auto-detects flame and starts profiling LLM calls.
Set `FLUSK_PROFILE_MODE=off` to disable.
