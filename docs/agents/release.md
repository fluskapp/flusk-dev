# Agent: Release New Version

Bump version and publish to npm.

## Instructions

1. Read `CLAUDE.md` at the repo root
2. Ensure all tests pass: `pnpm test && pnpm lint`
3. Create changeset: `pnpm changeset`
   - Select packages that changed
   - Use `minor` for new features, `patch` for fixes
   - Write a meaningful summary
4. Apply version bump: `pnpm run version` (NOT `pnpm version`!)
5. Build all packages: `pnpm build`
6. Commit: `chore: version packages vX.Y.Z`
7. Push to trigger release workflow
8. Verify on npm: `npm view @flusk/cli version`
9. Create GitHub release: `gh release create vX.Y.Z --generate-notes -R adirbenyossef/flusk-dev`

## Critical
- `pnpm run version` ≠ `pnpm version` (latter prints Node version)
- Changelog plugin is `@changesets/cli/changelog` (no GitHub token needed)
- All 10 packages: cli, forge, otel, resources, schema, types, entities, business-logic, execution, logger
