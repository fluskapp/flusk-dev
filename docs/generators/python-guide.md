# Python Guide

## How flusk-py Works

The `flusk-py` package is **100% generated** from the same YAML entity schemas that produce the TypeScript packages. No Python code is hand-written — it all flows from YAML through the forge generator.

```
packages/schema/entities/*.entity.yaml
    │
    │  flusk recipe python-package
    ▼
flusk-py/
  src/flusk/
    types/          → Pydantic models
    repositories/   → SQLite repos
    cli/            → Click commands
    otel/           → OTel instrumentation
```

## Installation

```bash
# Basic install
pip install flusk

# With provider extras
pip install flusk[openai]
pip install flusk[anthropic]
pip install flusk[gemini]
```

Or with uv:

```bash
uv pip install flusk
```

## Usage

```bash
# Analyze a Python script
flusk analyze agent.py

# Run for 120 seconds
flusk analyze agent.py --duration 120

# View reports
flusk report
flusk report <session-id>

# Browse history
flusk history

# Clear local data
flusk purge
```

## Architecture

The Python package mirrors the TypeScript architecture:

- **Pydantic models** replace TypeBox schemas
- **SQLite** via Python's built-in `sqlite3` module (same schema as Node.js)
- **Click** for CLI (same commands and flags as the Node.js CLI)
- **OpenTelemetry** for auto-instrumentation (intercepts HTTP calls to LLM providers)
- **Rich** for terminal output formatting

## Cross-Language Compatibility

The SQLite schema is identical between Node.js and Python. This means:

- Analyze a Node.js app, view the report from Python
- Analyze a Python app, view the report from Node.js
- Mix and match in the same `~/.flusk/data.db`

## Contributing

**Do not edit files in `flusk-py/` directly.** All Python code is generated.

To make changes:

1. Edit the YAML schema in `packages/schema/entities/`
2. If changing the Python generator itself, edit `packages/cli/src/generators/python/`
3. Run `flusk recipe python-package` to regenerate
4. Run tests: `cd flusk-py && pytest`

Python files use `# --- BEGIN GENERATED ---` markers. Everything between these markers is overwritten on each generation.

## Requirements

- Python ≥ 3.11
- Dependencies: pydantic, click, opentelemetry-api, opentelemetry-sdk, rich
