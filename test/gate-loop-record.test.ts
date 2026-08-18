/**
 * The gate entry the loop leaves in the session JSONL — split from
 * gate-loop.test.ts for the file cap. Memory is disabled in these fixtures,
 * so they are the honest-degradation proof: the entry is written in full,
 * no facts are attempted, and nothing warns.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { assistantText, assistantToolCalls } from "../src/features/provider/fake.js";
import { summarizeSession } from "../src/features/run/summary.js";
import { SessionStore } from "../src/features/session/session.repository.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
beforeEach(async () => {
	repo = await setupTestHome("flusk-gate-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

/** Scratch repos disable memory: the gate's record itself is under test here. */
async function setupVerify(checkSh: string): Promise<void> {
	await mkdir(join(repo, ".flusk"), { recursive: true });
	await writeFile(
		join(repo, ".flusk", "config.json"),
		JSON.stringify({ verify: ["sh check.sh"], memory: { enabled: false } }),
	);
	await writeFile(join(repo, "check.sh"), checkSh);
}

async function writeScript(turns: unknown[]): Promise<string> {
	const path = join(repo, "..", `gate-${Math.random().toString(16).slice(2)}.json`);
	await writeFile(path, JSON.stringify(turns));
	return path;
}

/** Path of the single session the run left behind. */
async function onlySessionPath(): Promise<string> {
	const root = join(process.env.FLUSK_HOME as string, "sessions");
	const names = (await readdir(root, { recursive: true })) as string[];
	const files = names.filter((n) => n.endsWith(".jsonl"));
	expect(files).toHaveLength(1);
	return join(root, files[0] as string);
}

/** The single session's LAST gate decision entry, read raw off the JSONL. */
async function onlySessionGate() {
	const entries = SessionStore.read(await onlySessionPath());
	for (const e of entries.reverse())
		if (e.type === "decision" && e.decision.kind === "gate") return e.decision;
	return undefined;
}

test("a steered retry that passes leaves a completed gate entry with the evidence", async () => {
	await setupVerify("test -f done.txt\n");
	const script = await writeScript([
		{ message: assistantText("done (allegedly)") }, // attempt 1: completes, wrote nothing
		{ message: assistantToolCalls([{ id: "g1", name: "bash", args: { command: "echo ok > done.txt" } }]) },
		{ message: assistantText("actually done") }, // attempt 2 wrap-up
	]);
	const cap = capture();
	const outcome = await runCmd({ task: "make done.txt", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("completed");
	const gate = await onlySessionGate();
	expect(gate?.outcome).toBe("completed");
	expect(gate?.retries).toBe(1);
	expect(gate?.verified).toEqual(["sh check.sh"]);
	expect(gate?.attempts).toHaveLength(1);
	expect(gate?.attempts?.[0]).toMatchObject({ retry: 0, cmd: "sh check.sh", exitCode: 1 });
	expect(gate?.reportCheck).toBe("ALLOW"); // "actually done" claims nothing checkable
	expect(gate?.reasons).toBeUndefined();
}, SLOW);

test("retries exhausted persists the blocked entry, silently with memory off", async () => {
	await mkdir(process.env.FLUSK_HOME as string, { recursive: true });
	await writeFile(
		join(process.env.FLUSK_HOME as string, "config.json"),
		JSON.stringify({ verify: { retries: 1 } }),
	);
	await setupVerify("echo still broken\nexit 1\n");
	const script = await writeScript([
		{ message: assistantText("attempt one") },
		{ message: assistantText("attempt two") },
	]);
	const cap = capture();
	const outcome = await runCmd({ task: "hopeless", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("blocked");
	const gate = await onlySessionGate();
	expect(gate?.outcome).toBe("blocked");
	expect(gate?.retries).toBe(1);
	expect(gate?.verified).toEqual([]);
	expect(gate?.attempts).toHaveLength(2);
	for (const [i, a] of (gate?.attempts ?? []).entries()) {
		expect(a).toMatchObject({ retry: i, cmd: "sh check.sh", exitCode: 1, skipped: false });
		expect(a.tail).toContain("still broken");
	}
	// The entry is the canonical "why": memory-off must carry the reasons too.
	expect(gate?.reasons).toEqual(["verify failed: sh check.sh exited 1"]);
	// Honest degradation: no store, no facts attempted, no warning.
	expect(cap.text()).not.toContain("warning");
	// And the run summary renders them from the entry alone (no fact store).
	const s = await summarizeSession(await onlySessionPath());
	expect(s.gateSource).toBe("entry");
	expect(s.reasons).toEqual(["verify failed: sh check.sh exited 1"]);
}, SLOW);
