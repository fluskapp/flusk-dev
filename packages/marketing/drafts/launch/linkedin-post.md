# LinkedIn Post — Launch Announcement

---

🚀 Today I'm open-sourcing Flusk — LLM cost intelligence for Node.js teams.

If you're building with AI APIs, you probably know the pain: costs spiral, duplicate prompts waste money, and there's no easy way to see what's happening under the hood.

Flusk fixes that with one command:

```
npx @flusk/cli analyze ./app.js
```

No infrastructure. No dashboards to set up. No vendor lock-in.

**What it does:**
• Tracks every LLM API call (OpenAI, Anthropic, Google Gemini)
• Detects duplicate and similar prompts
• Suggests model downgrades that save money without quality loss
• Budget alerts before you blow through limits
• Local-first storage with zero dependencies (node:sqlite)

**What makes it different:**
• Zero-touch — uses OpenTelemetry auto-instrumentation, no code changes
• CLI-first — runs anywhere, CI/CD friendly
• Privacy-first — `--redact` flag strips prompts from storage
• Fully open source, MIT licensed

**The numbers:**
• 10 npm packages under @flusk
• 362 tests passing
• 100% generated codebase from YAML schemas
• Built on the Fastify ecosystem

I built this because I needed it. Every AI project I worked on had the same blind spot: no idea what the actual cost per feature was.

Try it: https://github.com/adirbenyossef/flusk-dev

Star it if it's useful. PRs are very welcome.

#OpenSource #NodeJS #AI #LLM #DevTools #OpenTelemetry #CostOptimization
