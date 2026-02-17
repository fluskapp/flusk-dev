# Agent: Add LLM Provider Instrumentation

Add auto-instrumentation for a new LLM provider (Anthropic, Google, Azure, etc.)

## Instructions

1. Read `CLAUDE.md` at the repo root — follow ALL rules
2. Reference existing instrumentation: `packages/otel/src/instrumentations/openai-v6.ts`
3. Create new instrumentation file: `packages/otel/src/instrumentations/<provider>.ts`
4. Follow OTel GenAI semantic conventions for span attributes
5. Register in `packages/otel/src/register.ts`
6. Add provider pricing to `packages/otel/src/pricing/` (use versioned pricing — see #69)
7. Add HTTP URL pattern fallback in `packages/otel/src/exporters/parse-readable-span.ts`
8. Write tests in `packages/otel/src/__tests__/<provider>.test.ts`
9. Update README.md provider support section

## Key Patterns
- Intercept SDK client methods (create/complete/generate)
- Extract: model, tokens (input/output/total), duration, streaming flag
- Set span attributes: `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, etc.
- Handle streaming responses (collect chunks, sum tokens at end)
- OpenAI v6 broke traceloop — always write custom instrumentation
