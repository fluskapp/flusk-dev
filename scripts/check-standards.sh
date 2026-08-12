#!/usr/bin/env bash
# Repository standards gate, run in CI as `npm run standards`.
#
# 1. File size: no src/**/*.ts or test/**/*.ts file may exceed 150 lines.
#    The aspiration is <= ~100 lines (one concern per file); 150 is the
#    hard cap this script enforces.
# 2. Dependency boundary: `@earendil-works/pi-ai` may only be imported from
#    files matching src/provider/pi-ai*.ts. Everything else uses flusk's own
#    types (src/core/types.ts, src/provider/provider.ts).
# 3. The pi-ai "/compat" entrypoint must never be imported.
# 4. Dependency boundary: the LangChain packages (optional dependencies) may
#    only be named under src/lang/. Everything else — including tests — uses
#    flusk's own flow types (src/lang/types.ts) and the loader in src/lang/deps.ts.
set -euo pipefail

cd "$(dirname "$0")/.."
fail=0

# --- 1. file-size cap ---------------------------------------------------------
max_lines=150
offenders=$(find src test -name '*.ts' -type f -print0 2>/dev/null |
	xargs -0 wc -l 2>/dev/null |
	awk -v max="$max_lines" '$2 != "total" && $1 > max { printf "  %s (%d lines)\n", $2, $1 }')
if [ -n "$offenders" ]; then
	echo "FAIL: files exceed the ${max_lines}-line hard cap (aim for <= ~100):"
	echo "$offenders"
	fail=1
fi

# --- 2. pi-ai import boundary -------------------------------------------------
pi_ai_leaks=$(grep -rln '@earendil-works/pi-ai' src test --include='*.ts' 2>/dev/null |
	grep -v '^src/provider/pi-ai' || true)
if [ -n "$pi_ai_leaks" ]; then
	echo "FAIL: @earendil-works/pi-ai imported outside src/provider/pi-ai*.ts:"
	printf '  %s\n' $pi_ai_leaks
	fail=1
fi

# --- 3. no pi-ai /compat entrypoint anywhere ----------------------------------
compat_uses=$(grep -rln '@earendil-works/pi-ai/compat' src test --include='*.ts' 2>/dev/null || true)
if [ -n "$compat_uses" ]; then
	echo "FAIL: the pi-ai \"/compat\" entrypoint must not be imported:"
	printf '  %s\n' $compat_uses
	fail=1
fi

# --- 4. LangChain import boundary ---------------------------------------------
# LangChain/LangGraph are OPTIONAL dependencies: flusk must build, test and run
# with them absent. That only stays true while every mention of them lives
# behind src/lang/deps.ts, so the package names are banned everywhere else —
# a test that asserts on the install line should call langMissing() instead.
lang_leaks=$(grep -rlnE "@langchain/|['\"]langchain(/[a-zA-Z0-9_./-]+)?['\"]" src test --include='*.ts' 2>/dev/null |
	grep -v '^src/lang/' || true)
if [ -n "$lang_leaks" ]; then
	echo "FAIL: LangChain packages named outside src/lang/:"
	printf '  %s\n' $lang_leaks
	fail=1
fi

if [ "$fail" -eq 0 ]; then
	echo "standards: OK"
fi
exit "$fail"
