# Flusk (Python)

**LLM cost intelligence for Python teams.** Track every call. Find waste. Ship cheaper.

> ⚠️ **Generated from YAML schemas — do not edit directly.**
> All Python code in this package is produced by `flusk recipe python-package`.
> To make changes, edit the YAML schemas in `packages/schema/entities/` and regenerate.

## Quick Start

```bash
# Install
pip install flusk

# Or with uv
uv pip install flusk
```

```bash
# Analyze your Python app
flusk analyze agent.py
```

That's it. Flusk intercepts every LLM call via OpenTelemetry, calculates costs, and prints a report with savings opportunities.

## CLI Commands

```bash
flusk analyze <script>       # Run and analyze LLM costs
flusk report [id]            # View or regenerate a report
flusk history                # List past analysis sessions
flusk purge                  # Clear local data
```

## Supported Providers

- **OpenAI** — GPT-5.2, GPT-5.1, GPT-5.2-mini, o3-pro, o3-mini
- **Anthropic** — Claude Opus 4.6, Sonnet 4.5, Sonnet 4, Haiku 3.5
- **Google Gemini** — Gemini 2.5 Pro, Flash, Ultra

## Configuration

Create `.flusk.config.json` in your project root (or use `FLUSK_*` environment variables):

```json
{
  "budget": {
    "daily": 10.00,
    "monthly": 200.00,
    "perCallThreshold": 0.50
  }
}
```

## Storage

All data stored locally in SQLite at `~/.flusk/data.db`. The schema is **cross-language compatible** — sessions created by the Node.js CLI are readable from Python and vice versa.

## Requirements

- Python ≥ 3.11

## How It's Built

This package is 100% generated from the same YAML entity schemas that produce the TypeScript packages. The generator (`flusk recipe python-package`) reads each `.entity.yaml` file and produces:

- Pydantic models (types)
- SQLite repositories
- CLI commands (Click)
- OTel instrumentation hooks

Python files use `# --- BEGIN GENERATED ---` markers. Do not edit them — your changes will be overwritten on the next generation.

## Links

- [Main Repository](https://github.com/adirbenyossef/flusk-dev)
- [Python Guide](../docs/generators/python-guide.md)
- [Dual-Language Architecture](../docs/generators/dual-language.md)
- [YAML Schema Reference](../docs/generators/yaml-guide.md)

## License

[MIT](../LICENSE) © [Adir Ben Yossef](https://github.com/adirbenyossef) 2026
