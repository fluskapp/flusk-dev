# ADR-001: OTel Over Wrappers

## Status: Accepted (Feb 2026)

## Context
We needed to instrument LLM API calls. Two approaches:
1. Wrapper/monkey-patching (intercept SDK methods)
2. OpenTelemetry auto-instrumentation (standard spans)

## Decision
OTel-first. Zero code changes for the user.

## Why
- Wrappers are invasive — require users to change import paths
- OTel is an industry standard with existing instrumentations
- `@traceloop/instrumentation-*` packages already exist for
  OpenAI, Anthropic, Bedrock
- Users add `--import @flusk/otel` and nothing else changes
- Eran Broder (Platformatic) reviewed and confirmed wrappers
  are too invasive

## Consequences
- Depends on `@traceloop` packages for instrumentation quality
- Cannot intercept calls that OTel doesn't instrument
- Need custom span parser for each provider's attribute format
