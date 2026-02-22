# @flusk/business-logic

## 0.1.6

### Patch Changes

- Function registry with YAML-driven pure functions, app manifest with generate-all and validate-manifest commands, architecture map visualization, and lint fixes.
- Updated dependencies
  - @flusk/types@0.2.2
  - @flusk/entities@0.2.2

## 0.1.5

### Patch Changes

- ### Highlights

  - **`flusk explain`** — AI-powered cost analysis with actionable insights
  - **GitHub Action** — Automated PR cost comments via `@flusk/action`
  - **3 new generators** — `command`, `prompt`, `action` for rapid scaffolding
  - **Azure OpenAI + Cohere providers** — 15 models total
  - **Python package** — `flusk-py` generated from same YAML schemas
  - **PyPI Trusted Publisher** — credential-free publishing via GitHub OIDC

  ### Fixes

  - OTel register path resolution for src/ and dist/ layouts
  - Generator audit — regenerated missing files and fixed markers
  - Flushed OTel spans before child process exit

- Updated dependencies
  - @flusk/entities@0.2.1
  - @flusk/types@0.2.1

## 0.1.4

### Patch Changes

- f5eb699: Add Azure OpenAI and Cohere provider integrations; update OpenAI pricing with 2026 rates for o1, o1-mini, o1-pro, o3, o3-mini, o4-mini, gpt-4.1, gpt-4.1-mini, and gpt-4.1-nano models.

## 0.1.3

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

## 0.1.2

### Patch Changes

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

- Updated dependencies [595712f]
  - @flusk/entities@0.2.0
  - @flusk/types@0.2.0

## 0.1.1

### Patch Changes

- [`e4313d4`](https://github.com/adirbenyossef/flusk-dev/commit/e4313d4dea191d253d5d92ad29438ccbc3690629) Thanks [@adirbenyossef](https://github.com/adirbenyossef)! - Initial publish to npm under @flusk org.

- Updated dependencies [[`e4313d4`](https://github.com/adirbenyossef/flusk-dev/commit/e4313d4dea191d253d5d92ad29438ccbc3690629)]:
  - @flusk/types@0.1.1
  - @flusk/entities@0.1.1
