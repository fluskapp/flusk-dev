#!/usr/bin/env bash
# Repository standards gate, run in CI as `npm run standards`.
#
# 1. File size: no src/**/* or test/**/* TypeScript (.ts/.tsx) or Rust (.rs)
#    file may exceed 150 lines. The aspiration is <= ~100 lines (one concern
#    per file); 150 is the hard cap this script enforces.
# 2. Dependency boundary: `@earendil-works/pi-ai` may only be imported from
#    files matching src/features/provider/pi-ai*.ts. Everything else uses flusk's own
#    types (src/core/types.ts, src/provider/provider.ts).
# 3. The pi-ai "/compat" entrypoint must never be imported.
# 4. Dependency boundary: the LangChain packages (optional dependencies) may
#    only be named under src/features/flows/. Everything else — including tests — uses
#    flusk's own flow types (src/lang/types.ts) and the loader in src/lang/deps.ts.
set -euo pipefail

cd "$(dirname "$0")/.."
fail=0

# --- 1. file-size cap ---------------------------------------------------------
max_lines=150
size_dirs="src test"; [ -d crates ] && size_dirs="$size_dirs crates"
# shellcheck disable=SC2086
offenders=$(find $size_dirs -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.rs' \) -print0 2>/dev/null |
	xargs -0 wc -l 2>/dev/null |
	awk -v max="$max_lines" '$2 != "total" && $1 > max && $2 !~ /routeTree\.gen\.ts$/ { printf "  %s (%d lines)\n", $2, $1 }')
if [ -n "$offenders" ]; then
	echo "FAIL: files exceed the ${max_lines}-line hard cap (aim for <= ~100):"
	echo "$offenders"
	fail=1
fi

# --- 2. pi-ai import boundary -------------------------------------------------
pi_ai_leaks=$(grep -rln '@earendil-works/pi-ai' src test --include='*.ts' 2>/dev/null |
	grep -v '^src/features/provider/pi-ai' || true)
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
# behind src/features/flows/deps.ts, so the package names are banned everywhere else —
# a test that asserts on the install line should call langMissing() instead.
lang_leaks=$(grep -rlnE "@langchain/|['\"]langchain(/[a-zA-Z0-9_./-]+)?['\"]" src test --include='*.ts' 2>/dev/null |
	grep -v '^src/features/flows/' || true)
if [ -n "$lang_leaks" ]; then
	echo "FAIL: LangChain packages named outside src/features/flows/:"
	printf '  %s\n' $lang_leaks
	fail=1
fi

# --- 5. repository boundary ---------------------------------------------------
# Inside src/features/**, all disk, git, subprocess and native access lives in
# *.repository.ts. Any other feature file importing node:fs, node:fs/promises,
# node:child_process or platform/native is reaching past the seam that keeps
# engine I/O out of services, routers and the client bundle.
repo_leaks=$(grep -rlnE 'from "node:(fs|fs/promises|child_process)"|from ".*platform/native' \
	src/features --include='*.ts' 2>/dev/null | grep -v '\.repository\.ts$' || true)
if [ -n "$repo_leaks" ]; then
	echo "FAIL: disk/subprocess/native import outside *.repository.ts:"
	printf '  %s\n' $repo_leaks
	fail=1
fi

# --- 6. route -> feature boundary ---------------------------------------------
# src/routes/** may import from a feature only via its *.router.ts, *.types.ts
# or *.functions.ts (typed server functions — the Start-era router surface;
# they take the .router.ts name when the legacy HTTP routers are deleted at
# the one-cut). This replaces the package boundary a monorepo would have
# given us: it is what stops engine code reaching the client bundle.
if [ -d src/routes ]; then
	route_leaks=$(grep -rEn 'from "[^"]*features/[^"]*"' src/routes --include='*.ts' --include='*.tsx' 2>/dev/null |
		grep -vE '\.(router|types|functions)\.js"' || true)
	if [ -n "$route_leaks" ]; then
		echo "FAIL: src/routes/** imports a feature past its router/types seam:"
		printf '  %s\n' "$route_leaks"
		fail=1
	fi
fi

# --- 7. services stay pure ----------------------------------------------------
# *.service.ts is orchestration over repositories: no node:* imports at all.
svc_leaks=$(grep -rlnE 'from "node:' src --include='*.service.ts' 2>/dev/null || true)
if [ -n "$svc_leaks" ]; then
	echo "FAIL: node:* imported from a *.service.ts:"
	printf '  %s\n' $svc_leaks
	fail=1
fi

if [ "$fail" -eq 0 ]; then
	echo "standards: OK"
fi
exit "$fail"
