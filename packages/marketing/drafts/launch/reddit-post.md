# Reddit Posts — Launch Announcement

## r/node

**Title:** I built an open-source CLI to track LLM API costs in Node.js apps — zero setup, zero deps

**Body:**

Hey r/node,

I've been building AI-powered features and got frustrated with the lack of visibility into what my LLM calls actually cost. So I built Flusk.

**What it is:** A CLI that wraps your Node.js app, intercepts all LLM API calls via OpenTelemetry, and gives you a cost report.

```bash
npx @flusk/cli analyze ./app.js
```

**Key decisions:**
- Uses `node:sqlite` (Node 22+ built-in) — zero external dependencies for storage
- OTel auto-instrumentation — no code changes, no monkey-patching your SDK calls
- Supports OpenAI, Anthropic, and Google Gemini out of the box
- Everything stays local, `--redact` flag if you don't want prompts stored

**What it reports:**
- Cost per call, per model, per session
- Duplicate prompt detection (exact hash + fuzzy matching coming)
- Model downgrade suggestions
- Budget threshold alerts

**Stack:** Fastify ecosystem (Pino, undici), TypeScript, pnpm monorepo, 10 packages on npm.

It's MIT licensed: https://github.com/adirbenyossef/flusk-dev

Would love feedback, especially on:
1. What other providers should we prioritize? (Azure, Cohere, Mistral?)
2. Would a GitHub Action that comments PR cost diffs be useful?
3. Any features you'd want for your AI cost tracking?

---

## r/opensource

**Title:** Flusk — open-source LLM cost intelligence (Node.js, CLI-first, MIT)

**Body:**

Just open-sourced Flusk, a tool I've been building to track and optimize LLM API costs.

The problem: AI API costs are invisible until the bill arrives. Duplicate prompts, overqualified models, no per-feature cost breakdown.

The solution: `npx @flusk/cli analyze ./app.js` — one command, instant cost report.

- Zero infrastructure (stores everything in node:sqlite)
- Auto-instruments OpenAI, Anthropic, Google Gemini via OTel
- Privacy-first with `--redact` flag
- 10 packages, 362 tests, MIT licensed

GitHub: https://github.com/adirbenyossef/flusk-dev
npm: https://www.npmjs.com/package/@flusk/cli

The codebase is 100% generated from YAML schemas using a custom generator framework — interesting approach for contributors since you edit YAML, not TypeScript.

Feedback and PRs welcome.

---

## r/artificial

**Title:** Open-source tool to track what your LLM API calls actually cost

**Body:**

Built an open-source CLI that auto-instruments your Node.js app and shows you exactly what each LLM call costs.

Works with OpenAI, Anthropic (Claude), and Google Gemini. Uses OpenTelemetry under the hood — zero code changes needed.

One command: `npx @flusk/cli analyze ./app.js`

Detects duplicate prompts, suggests cheaper models, and has budget alerts. Everything stays local.

GitHub: https://github.com/adirbenyossef/flusk-dev

MIT licensed, looking for feedback.
