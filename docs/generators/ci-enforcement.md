# CI Enforcement — Generator Guard

## Overview

The Generator Guard prevents PRs from merging when generated files
are stale or hand-edited. This ensures the codebase stays in sync
with entity YAML schemas.

## How It Works

1. `flusk validate-generated` scans all `.ts` files with `@generated` headers
2. Compares the SHA-256 hash stored in the header vs the current YAML file
3. Detects files where region markers were removed (tampering)
4. Reports: ✅ up-to-date, ⚠️ stale, ❌ tampered/orphaned

## Fixing Stale Files

```bash
# See what's stale
flusk validate-generated

# Regenerate stale files (preserves CUSTOM sections)
flusk regenerate

# Verify everything is fresh
flusk validate-generated --strict
```

## GitHub Action

The `generator-guard.yml` workflow runs on every PR:

```yaml
- run: npx flusk validate-generated --strict
```

This exits with code 1 if any files are stale or tampered,
blocking the PR from merging.

## Generator Ratio

Track coverage toward the 90% target:

```bash
flusk ratio          # Human-readable
flusk ratio --json   # Machine-readable
```

## Common Scenarios

**"I changed a YAML field"** → Run `flusk regenerate`

**"validate says tampered"** → You edited a generated file directly.
Move your code to a CUSTOM region, then regenerate.

**"orphaned file"** → The source YAML was deleted. Remove the
generated file or create the missing YAML.
