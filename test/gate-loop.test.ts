import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { assistantText, assistantToolCalls } from "../src/features/provider/fake.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
beforeEach(async () => {
	repo = await setupTestHome("flusk-gate-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

/** Scratch repos disable memory: the gate itself is under test here. */
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

async function onlySessionContext() {
	const root = join(process.env.FLUSK_HOME as string, "sessions");
	const names = (await readdir(root, { recursive: true })) as string[];
	const files = names.filter((n) => n.endsWith(".jsonl"));
	expect(files).toHaveLength(1);
	const session = Session.load(join(root, files[0] as string));
	const context = session.buildContext();
	session.close();
	return context;
}

test("gate failure steers the SAME session; the retry attempt fixes it and passes", async () => {
	await setupVerify("test -f done.txt\n");
	const script = await writeScript([
		{ message: assistantText("done (allegedly)") }, // attempt 1: completes, wrote nothing
		{ message: assistantToolCalls([{ id: "g1", name: "bash", args: { command: "echo ok > done.txt" } }]) },
		{ message: assistantText("actually done") }, // attempt 2 wrap-up
	]);
	const cap = capture();
	const outcome = await runCmd({ task: "make done.txt", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("completed");
	expect(existsSync(join(repo, "done.txt"))).toBe(true);
	// One session file: the continuation re-entered the same session with the
	// verify evidence as a steering user message.
	const context = await onlySessionContext();
	const steer = context.find(
		(m) => m.role === "user" && m.content.includes("Verification failed: sh check.sh exited 1"),
	);
	expect(steer).toBeDefined();
	expect(cap.text()).toMatch(/^completed · 2 turns/); // final attempt's stats line
}, SLOW);

test("retries exhausted → blocked outcome with the failing command and tail", async () => {
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
	expect(cap.text()).toContain("blocked: verification failing after 1 retries");
	expect(cap.text()).toContain("sh check.sh exited 1");
	expect(cap.text()).toContain("still broken");
}, SLOW);

test("--no-verify skips the whole gate even with failing verify commands", async () => {
	await setupVerify("exit 1\n");
	const script = await writeScript([{ message: assistantText("done") }]);
	const cap = capture();
	const outcome = await runCmd({
		task: "skip gate",
		repo,
		fake: script,
		noVerify: true,
		quiet: true,
		out: cap.out,
	});
	// A gated run would exhaust the one-turn script on continuation; skipping
	// the gate means the single completed attempt is the outcome.
	expect(outcome).toBe("completed");
	expect(cap.text()).not.toContain("blocked");
}, SLOW);

test("no verify commands detected → the gate is a pass-through no-op", async () => {
	await mkdir(join(repo, ".flusk"), { recursive: true });
	await writeFile(join(repo, ".flusk", "config.json"), JSON.stringify({ memory: { enabled: false } }));
	const script = await writeScript([{ message: assistantText("done") }]);
	const cap = capture();
	const outcome = await runCmd({ task: "plain", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("completed");
	expect(cap.text()).toMatch(/^completed · 1 turns/);
}, SLOW);

test("non-completed runs never enter the gate", async () => {
	await setupVerify("exit 1\n");
	const script = await writeScript([
		{ message: { role: "assistant", content: [], stopReason: "error", errorMessage: "boom" } },
	]);
	const cap = capture();
	const outcome = await runCmd({ task: "fails", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("error");
	expect(cap.text()).not.toContain("blocked");
}, SLOW);
