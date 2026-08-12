/**
 * What counts as a command that VERIFIED something.
 *
 * "verified" is the most expensive outcome a card can carry — it tells a future
 * run "copy this, someone checked it" — so the evidence has to be a command
 * whose own exit status was the test runner's. Three shapes used to slip
 * through a plain substring match and all three are reachable in the real
 * corpus:
 *
 * - a MENTION rather than a run: `git commit -m "make test pass"`,
 *   `rg -n "vitest" src`, `echo "npm test" >> README.md`, `git log
 *   --grep="npm run build"` — all match "npm test"/"vitest", all exit 0. So the
 *   command must sit at the HEAD of a shell segment, not anywhere inside it.
 * - a status that is not the runner's: `npm test || true` and
 *   `npm test 2>&1 | tail -20` both exit 0 whatever the tests did. A segment
 *   containing `|` (pipe or `||`) therefore proves nothing.
 * - a run BEFORE the edits (ordering) — handled by the caller, which compares
 *   when the verify happened against the last successful write.
 */

/** Commands whose success is real evidence that the run verified itself. */
const VERIFY_CMD =
	/^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|check|lint|build|typecheck)\b|^(?:npx\s+)?(?:vitest|jest|tsc)\b|^pytest\b|^cargo\s+(?:test|check|clippy)\b|^go\s+test\b|^make\s+(?:test|check)\b/i;

/** Env prefixes and wrappers that do not change whose exit status it is. */
const PREFIX = /^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:sudo\s+|time\s+|command\s+)?/;

/**
 * True when the command RUNS a verification whose exit status is its own.
 * Segments are the `&&`/`;`/newline steps of a compound command; a segment
 * carrying a pipe or an `||` is skipped because its status is somebody else's.
 */
export function isVerifyCommand(command: string): boolean {
	for (const segment of command.split(/&&|;|\n/)) {
		if (segment.includes("|")) continue;
		if (VERIFY_CMD.test(segment.trim().replace(PREFIX, ""))) return true;
	}
	return false;
}
