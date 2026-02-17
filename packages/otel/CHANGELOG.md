# @flusk/otel

## 0.2.1

### Patch Changes

- ### New Providers

  - Anthropic SDK instrumentation (monkey-patches Messages.create, streaming support)
  - Google Gemini SDK instrumentation (generateContent + generateContentStream)
  - Provider SDKs as optional peer dependencies

  ### Bug Fixes

  - Fixed top-level await in register.ts — graceful error handling on init failure
  - Fixed TUI generators referencing non-existent screen files — auto-discovers screens dynamically

  ### Generator Upgrade

  - Provider generator now produces full instrumentation from YAML schema (instrumentations, pricing, span-config, tests, auto-registration)
  - New provider YAML schema at `packages/schema/providers/`

- Updated dependencies
  - @flusk/business-logic@0.1.3
  - @flusk/resources@0.2.1

## 0.2.0

### Minor Changes

- 595712f: ## v0.2.0 — E2E Flow + Security Hardening

  ### New Features

  - **E2E flow works**: `npx @flusk/cli analyze ./app.js` intercepts LLM calls, stores in SQLite, prints cost report
  - **Session-based tracking**: Each analyze run gets a unique session ID for isolated reporting
  - **`--redact` flag**: Strip prompt/completion content before storage for privacy
  - **Streaming support**: OpenAI v6 streaming calls now instrumented
  - **Export commands**: `export test` sends real test spans, `export setup` persists config
  - **Demo video**: 74-second Remotion video with 10 scenes

  ### Security

  - OTLP receiver authenticated with random Bearer token per session
  - Path traversal prevention in analyze command
  - Prompt redaction support

  ### Bug Fixes

  - Report filters by session (not all calls in DB)
  - SQLite singleton validates path changes
  - SIGINT handler cleanup on child exit
  - Versioned model names resolved for pricing
  - Safe token count access with fallback
  - promptHash excludes model name for accurate dedup
  - Script existence validated before spawning

### Patch Changes

- Updated dependencies [595712f]
  - @flusk/resources@0.2.0
  - @flusk/business-logic@0.1.2
  - @flusk/logger@0.1.2

## 0.1.1

### Patch Changes

- [`e4313d4`](https://github.com/adirbenyossef/flusk-dev/commit/e4313d4dea191d253d5d92ad29438ccbc3690629) Thanks [@adirbenyossef](https://github.com/adirbenyossef)! - Initial publish to npm under @flusk org.

- Updated dependencies [[`e4313d4`](https://github.com/adirbenyossef/flusk-dev/commit/e4313d4dea191d253d5d92ad29438ccbc3690629)]:
  - @flusk/logger@0.1.1
  - @flusk/resources@0.1.1
  - @flusk/business-logic@0.1.1
