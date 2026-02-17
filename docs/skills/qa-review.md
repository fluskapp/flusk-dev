# Skill: QA & Security Review

Run a comprehensive review of the Flusk codebase.

## Full QA Validation
```bash
pnpm tsx scripts/qa-validate.ts
```

## Manual Checks

### Security
- No hardcoded secrets: `grep -r "sk-" packages/ --include="*.ts" -l`
- Parameterized SQL queries (no string interpolation)
- Path traversal: all file paths validated against base directory
- OTLP receiver requires auth token (`FLUSK_OTLP_TOKEN`)
- Rate limiting on server routes
- `--redact` flag for prompt privacy

### Code Quality
- Generator ratio: `pnpm tsx packages/cli/bin/flusk.ts ratio`
- Generated check: `pnpm tsx scripts/check-generated.ts`
- Protected files: `pnpm tsx packages/cli/bin/flusk.ts guard`
- Lint: `pnpm lint`
- Tests: `pnpm test`

### Creating Issues
```bash
gh issue create -R adirbenyossef/flusk-dev \
  -t "Title" \
  -b "Description" \
  -l "bug|enhancement|security"
```
