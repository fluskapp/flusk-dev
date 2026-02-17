# @flusk/resources

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
  - @flusk/entities@0.2.0
  - @flusk/types@0.2.0
  - @flusk/business-logic@0.1.2
  - @flusk/logger@0.1.2

## 0.1.1

### Patch Changes

- [`e4313d4`](https://github.com/adirbenyossef/flusk-dev/commit/e4313d4dea191d253d5d92ad29438ccbc3690629) Thanks [@adirbenyossef](https://github.com/adirbenyossef)! - Initial publish to npm under @flusk org.

- Updated dependencies [[`e4313d4`](https://github.com/adirbenyossef/flusk-dev/commit/e4313d4dea191d253d5d92ad29438ccbc3690629)]:
  - @flusk/logger@0.1.1
  - @flusk/types@0.1.1
  - @flusk/entities@0.1.1
  - @flusk/business-logic@0.1.1
