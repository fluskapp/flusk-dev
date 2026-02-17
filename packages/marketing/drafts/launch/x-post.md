# X/Twitter Post — Launch Announcement

## Main Post (Thread starter)

🚀 Introducing Flusk — open-source LLM cost intelligence for Node.js

One command. Zero setup. Know exactly what your AI calls cost.

npx @flusk/cli analyze ./app.js

MIT licensed. Just shipped to npm.

github.com/adirbenyossef/flusk-dev

🧵👇

## Reply 1 — The Problem

Every AI app bleeds money silently.

Duplicate prompts. Overqualified models. No visibility.

We built Flusk because we needed it ourselves — and couldn't find anything that "just worked" without infrastructure.

## Reply 2 — What It Does

One command gives you:

📊 Cost per call, per model, per session
🔍 Duplicate prompt detection
💡 Model downgrade suggestions
🚨 Budget alerts before you blow through limits
🔒 --redact flag for prompt privacy

All stored locally with zero-dep node:sqlite.

## Reply 3 — Multi-Provider

Works with:
• OpenAI (GPT-4o, o3, etc.)
• Anthropic (Claude Opus, Sonnet, Haiku)
• Google Gemini (2.5 Pro, Flash)

Zero-touch OTel instrumentation — no code changes needed.

## Reply 4 — The Stack

Built on:
• OpenTelemetry (gen_ai semantic conventions)
• node:sqlite (zero deps, Node 22+)
• Fastify ecosystem (Pino, undici)
• 100% generated codebase from YAML schemas

362 tests. 10 npm packages. MIT license.

## Reply 5 — CTA

Try it now:
npm i -g @flusk/cli
flusk analyze ./your-app.js

⭐ Star us: github.com/adirbenyossef/flusk-dev
📦 npm: npmjs.com/package/@flusk/cli

We're just getting started. PRs welcome.

#opensource #nodejs #AI #LLM #devtools #opentelemetry
