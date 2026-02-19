# Observability Integrations

Flusk exports LLM cost data as OpenTelemetry spans. You can fan out to any OTLP-compatible backend — **locally** (SQLite) and **externally** (Grafana, Datadog, New Relic) simultaneously.

## How It Works

```
Your App → Flusk OTel → MultiSpanExporter
                           ├── SQLite (always, local)
                           ├── Grafana Tempo (optional)
                           ├── Datadog APM (optional)
                           └── New Relic (optional)
```

All span data includes: model name, token counts, cost, latency, prompt hash (for dedup detection), and provider metadata.

## Quick Setup

### Grafana Cloud (Tempo + Grafana)

1. Get your Grafana Cloud OTLP endpoint and API token from [grafana.com/auth/sign-in](https://grafana.com/auth/sign-in) → My Account → Tempo

2. Configure:
```bash
# One-time setup
npx @flusk/cli export setup grafana \
  --endpoint https://tempo-us-central1.grafana.net/tempo \
  --api-key <your-grafana-api-token>

# Or via environment variables
export FLUSK_EXPORT=grafana
export FLUSK_GRAFANA_ENDPOINT=https://tempo-us-central1.grafana.net/tempo
export FLUSK_GRAFANA_API_KEY=glc_xxx

# Run analysis — spans go to both SQLite and Grafana
npx @flusk/cli analyze ./app.js
```

3. In Grafana, create a dashboard with:
   - **Cost per model** — group spans by `llm.model`, sum `llm.cost`
   - **Token usage over time** — timeseries of `llm.tokens.total`
   - **Duplicate detection** — filter by `llm.prompt.duplicate=true`
   - **P95 latency** — histogram of span duration by model

### Datadog APM

1. Get your Datadog API key from [app.datadoghq.com](https://app.datadoghq.com) → Organization Settings → API Keys

2. Configure:
```bash
# One-time setup
npx @flusk/cli export setup datadog \
  --endpoint https://trace.agent.datadoghq.com \
  --api-key <your-dd-api-key>

# Or via environment variables
export FLUSK_EXPORT=datadog
export FLUSK_DATADOG_ENDPOINT=https://trace.agent.datadoghq.com
export FLUSK_DATADOG_API_KEY=dd_xxx

# Run
npx @flusk/cli analyze ./app.js
```

3. In Datadog:
   - Go to **APM → Traces** to see individual LLM calls
   - Create a **Dashboard** with cost metrics from span tags
   - Set up **Monitors** for budget alerts (e.g., cost > $10/hour)

### New Relic

```bash
npx @flusk/cli export setup newrelic \
  --endpoint https://otlp.nr-data.net:4318 \
  --api-key <your-nr-license-key>

# Or env vars
export FLUSK_EXPORT=newrelic
export FLUSK_NEWRELIC_ENDPOINT=https://otlp.nr-data.net:4318
export FLUSK_NEWRELIC_API_KEY=nr_xxx
```

### Multiple Backends (Fan-out)

Send to multiple backends simultaneously:

```bash
export FLUSK_EXPORT=grafana,datadog
export FLUSK_GRAFANA_ENDPOINT=https://tempo-us-central1.grafana.net/tempo
export FLUSK_GRAFANA_API_KEY=glc_xxx
export FLUSK_DATADOG_ENDPOINT=https://trace.agent.datadoghq.com
export FLUSK_DATADOG_API_KEY=dd_xxx

npx @flusk/cli analyze ./app.js
# → spans go to SQLite + Grafana + Datadog
```

## Span Attributes

Every LLM span includes these semantic attributes:

| Attribute | Type | Example |
|-----------|------|---------|
| `llm.model` | string | `gpt-4o` |
| `llm.provider` | string | `openai` |
| `llm.tokens.prompt` | int | `1250` |
| `llm.tokens.completion` | int | `340` |
| `llm.tokens.total` | int | `1590` |
| `llm.cost` | float | `0.0234` |
| `llm.cost.currency` | string | `USD` |
| `llm.prompt.hash` | string | `sha256:abc...` |
| `llm.prompt.duplicate` | bool | `true` |
| `llm.latency_ms` | int | `1230` |
| `flusk.project` | string | `my-app` |

## Verify Export

```bash
# Check configured exports
npx @flusk/cli export list

# Test connectivity
npx @flusk/cli export test grafana
```

## Grafana Dashboard Template

Import this JSON into Grafana for a ready-made LLM cost dashboard:

```json
{
  "dashboard": {
    "title": "Flusk — LLM Cost Intelligence",
    "panels": [
      {
        "title": "Cost by Model",
        "type": "piechart",
        "targets": [{ "expr": "sum by (llm_model) (llm_cost)" }]
      },
      {
        "title": "Token Usage Over Time",
        "type": "timeseries",
        "targets": [{ "expr": "sum(rate(llm_tokens_total[5m])) by (llm_model)" }]
      },
      {
        "title": "Duplicate Prompts",
        "type": "stat",
        "targets": [{ "expr": "count(llm_prompt_duplicate == 1)" }]
      },
      {
        "title": "P95 Latency by Model",
        "type": "histogram",
        "targets": [{ "expr": "histogram_quantile(0.95, llm_latency_ms) by (llm_model)" }]
      }
    ]
  }
}
```
