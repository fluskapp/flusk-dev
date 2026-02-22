#!/usr/bin/env bash
# Enhanced pre-commit hook for flusk schema enforcement.
# Install: cp scripts/pre-commit-enhanced.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
# Or add to git-hooks/ and configure core.hooksPath.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

ERRORS=0

echo "🔍 Flusk pre-commit checks..."

# 1. Check for fake @generated headers on protected files
echo "  → Checking protected files..."
if ! pnpm tsx scripts/check-protected.ts; then
  ERRORS=$((ERRORS + 1))
fi

# 2. Validate generated files are not tampered
echo "  → Validating generated files..."
if ! pnpm tsx packages/cli/bin/flusk.ts validate-generated --strict 2>/dev/null; then
  echo "  ❌ Generated files are stale or tampered. Run: flusk regenerate"
  ERRORS=$((ERRORS + 1))
fi

# 3. Check generator ratio
echo "  → Checking generator ratio..."
RATIO_OUTPUT=$(pnpm tsx packages/cli/bin/flusk.ts ratio --json 2>/dev/null || echo '{}')
RATIO=$(echo "$RATIO_OUTPUT" | grep -o '"ratio":[0-9.]*' | cut -d: -f2 || echo "0")
THRESHOLD="0.9"
if [ -n "$RATIO" ] && [ "$(echo "$RATIO < $THRESHOLD" | bc -l 2>/dev/null || echo 1)" = "1" ]; then
  echo "  ⚠️  Generator ratio ${RATIO} is below threshold ${THRESHOLD}"
  # Warning only — don't block commit for ratio
fi

# 4. Check new files have @generated headers
echo "  → Checking new files for @generated headers..."
NEW_FILES=$(git diff --cached --name-only --diff-filter=A | grep -E '\.(ts|tsx)$' | grep '^packages/' | grep -v '^packages/forge/' | grep -v '\.test\.' | grep -v '\.d\.ts$' | grep -v '/index\.ts$' || true)

if [ -n "$NEW_FILES" ]; then
  for file in $NEW_FILES; do
    if [ -f "$file" ]; then
      HEAD=$(head -c 500 "$file")
      if ! echo "$HEAD" | grep -q '@generated'; then
        echo "  ❌ New file without @generated header: $file"
        echo "     Use a generator: flusk g feature <name> or flusk recipe <recipe>"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
fi

# 5. Check that GENERATED sections weren't modified without regenerate
echo "  → Checking GENERATED section integrity..."
MODIFIED_FILES=$(git diff --cached --name-only --diff-filter=M | grep -E '\.(ts|tsx)$' | grep '^packages/' || true)

if [ -n "$MODIFIED_FILES" ]; then
  for file in $MODIFIED_FILES; do
    if [ -f "$file" ] && head -c 500 "$file" | grep -q '@generated'; then
      # Check if diff touches GENERATED sections
      DIFF=$(git diff --cached -U0 -- "$file")
      if echo "$DIFF" | grep -q '// --- BEGIN GENERATED\|// --- END GENERATED'; then
        echo "  ❌ GENERATED section modified in: $file"
        echo "     Run: flusk regenerate (don't edit generated sections manually)"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
fi

# Final result
if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "🚫 Pre-commit blocked: $ERRORS error(s) found."
  echo "   Fix issues above or use --no-verify to bypass (not recommended)."
  exit 1
fi

echo "✅ All pre-commit checks passed."
