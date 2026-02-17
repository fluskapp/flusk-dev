# Agent: Fix GitHub Issues

Fix one or more GitHub issues from the flusk-dev repo.

## Instructions

1. Read the issue(s) from GitHub: `gh issue view <number> -R adirbenyossef/flusk-dev`
2. Read `CLAUDE.md` at the repo root — follow ALL rules
3. **Use generators for any code changes** — do NOT hand-write generated files
4. For entity changes: edit YAML in `packages/schema/entities/`, then `pnpm tsx packages/cli/bin/flusk.ts regenerate`
5. For new features: `pnpm tsx packages/cli/bin/flusk.ts g feature <name>`
6. Only edit `// --- BEGIN CUSTOM ---` sections in generated files
7. After changes:
   - `pnpm lint` (must pass)
   - `pnpm test` (must pass)
   - `pnpm tsx scripts/check-generated.ts` (must pass)
8. Commit with: `fix(package): description (closes #N)`
9. Push to main

## Common Pitfalls
- SQL files need `--` comments, NOT `/** */`
- Don't add `@generated` headers to hand-written files
- Check `.flusk/protected.json` before editing files
- Use named params for functions with 5+ arguments
