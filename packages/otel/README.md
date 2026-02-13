# @flusk/otel

Zero-touch OpenTelemetry auto-instrumentation for Flusk.

## Usage

```bash
node --import @flusk/otel ./index.js
```

Or import at the top of your entry file:

```ts
import '@flusk/otel';
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `FLUSK_API_KEY` | Flusk API key | — |
| `FLUSK_ENDPOINT` | OTLP endpoint | `https://otel.flusk.dev` |
| `FLUSK_PROJECT_NAME` | Service/project name | `default` |
| `FLUSK_CAPTURE_CONTENT` | Capture prompt/response content | `true` |
| `FLUSK_PROFILE_MODE` | Profiling mode: `auto`, `manual`, `off` | `auto` |

## Performance Profiling (Optional)

Install `@platformatic/flame` for automatic CPU/heap profiling:

```bash
npm install @platformatic/flame
```

That's it. `@flusk/otel` auto-detects flame and starts profiling LLM calls.
Set `FLUSK_PROFILE_MODE=off` to disable.
