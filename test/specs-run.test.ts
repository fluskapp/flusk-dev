import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { renderDecisionLog } from "../src/cli/explain-render.js";
import { runCmd } from "../src/cli/run-cmd.js";
import type { HeaderEntry } from "../src/features/session/entries.js";
import { SessionStore } from "../src/features/session/session.repository.js";
import { readSpec } from "../src/features/specs/spec-files.repository.js";
import { SPEC_DIR } from "../src/features/specs/spec.types.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-spec-run-");
	await mkdir(join(repo, SPEC_DIR), { recursive: true });
	await writeFile(
		join(repo, SPEC_DIR, "retry-hook.md"),
		"---\ntitle: Ship the retry hook\nstatus: planned\nmode: refactor\nacceptance:\n" +
			"  - dispatch retries with backoff, capped at five\n  - the journal names every attempt\n" +
			"---\n\nThe dispatcher gives up on the first failure today.\n",
	);
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

/** The outcome line names the session file; read it back as entries. */
function sessionEntries(text: string) {
	const path = / turns · \$[\d.]+ · (.+)\n/.exec(text)?.[1];
	expect(path).toBeDefined();
	return SessionStore.read(path as string);
}

test("--spec runs the spec: composed task, mode-routed kind, decision entry, status transition", async () => {
	const cap = capture();
	const outcome = await runCmd({
		task: "(replaced by the spec)",
		repo,
		spec: "retry-hook",
		quiet: true,
		noVerify: true,
		out: cap.out,
	});
	expect(outcome).toBe("completed");
	const entries = sessionEntries(cap.text());
	const header = entries[0] as HeaderEntry;
	// The spec IS the task: title, body, then the acceptance list verbatim.
	expect(header.task).toBe(
		"Ship the retry hook\n\nThe dispatcher gives up on the first failure today.\n\n" +
			"Acceptance:\n- dispatch retries with backoff, capped at five\n- the journal names every attempt",
	);
	expect(header.taskKind).toBe("code"); // MODE_KIND.refactor
	const spec = entries.find((e) => e.type === "decision" && e.decision.kind === "spec");
	expect(spec).toMatchObject({
		decision: { kind: "spec", name: "retry-hook", mode: "refactor", path: `${SPEC_DIR}/retry-hook.md` },
	});
	// The gate passed, so "building" (written at start) became "verifying".
	expect(readSpec(repo, "retry-hook")?.status).toBe("verifying");
}, SLOW);

test("--kind still overrides the spec's mode routing", async () => {
	const cap = capture();
	await runCmd({
		task: "-",
		repo,
		spec: "retry-hook",
		kind: "review",
		quiet: true,
		noVerify: true,
		out: cap.out,
	});
	expect((sessionEntries(cap.text())[0] as HeaderEntry).taskKind).toBe("review");
}, SLOW);

test("a missing spec refuses with its reason before anything runs", async () => {
	await expect(runCmd({ task: "-", repo, spec: "nope", quiet: true })).rejects.toThrow(
		/spec "nope" in \.flusk\/specs/,
	);
}, SLOW);

test("flusk explain renders the spec decision as its own line", () => {
	const rendered = renderDecisionLog({
		runId: "r1",
		task: "t",
		createdAt: "2026-08-15T00:00:00Z",
		decisions: [
			{
				at: "2026-08-15T00:00:00Z",
				decision: { kind: "spec", name: "retry-hook", mode: "refactor", path: `${SPEC_DIR}/retry-hook.md` },
			},
		],
		gate: null,
	});
	expect(rendered).toContain("spec       retry-hook (refactor) — .flusk/specs/retry-hook.md");
}, SLOW);
