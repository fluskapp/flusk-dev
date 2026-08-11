/**
 * "verified" is the most expensive outcome a card can carry — it is the one
 * that tells a future run "copy this, someone checked it". These are the four
 * ways a run used to earn it without verifying anything.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { Msg } from "../src/core/types.js";
import { sessionCards } from "../src/history/source-sessions.js";
import { isVerifyCommand } from "../src/history/verify-evidence.js";
import { asst, call, res, say, session } from "./history-session-fixtures.js";

let home: string;
let repoRoot: string;
let prevHome: string | undefined;
let keys: Record<string, string>;
const outcome = (name: string): string | undefined =>
	sessionCards().find((c) => c.ref === keys[name])?.outcome;

/** One bash call, then one edit, then the closing report. */
const run = (command: string, output: string, editFirst: boolean): Msg[] => {
	const bash = call("b", "bash", { command });
	const write = call("w", "write", { file_path: "src/fetch.ts" });
	return [
		{ role: "user", content: "go" },
		asst(editFirst ? [write, bash] : [bash, write]),
		res("w", "write", "wrote 40 lines"),
		res("b", "bash", output),
		say("done"),
	];
};

beforeAll(() => {
	prevHome = process.env.AH_HOME;
	home = mkdtempSync(join(tmpdir(), "ah-home-verified-"));
	repoRoot = mkdtempSync(join(tmpdir(), "ah-repo-"));
	process.env.AH_HOME = home;
	keys = {
		baseline: session(repoRoot, "a", run("npm test", "12 passed", false), "completed"),
		after: session(repoRoot, "b", run("npm test", "12 passed", true), "completed"),
		mention: session(
			repoRoot,
			"c",
			run('git commit -m "make test pass before merging"', "1 file changed", true),
			"completed",
		),
		guarded: session(repoRoot, "d", run("npm test || true", "1 failing", true), "completed"),
		piped: session(repoRoot, "e", run("npm test 2>&1 | tail -20", "1 failing", true), "completed"),
	};
});

afterAll(() => {
	if (prevHome === undefined) delete process.env.AH_HOME;
	else process.env.AH_HOME = prevHome;
	rmSync(home, { recursive: true, force: true });
	rmSync(repoRoot, { recursive: true, force: true });
});

it("earns verified only when the verification ran AFTER the last edit", () => {
	expect(outcome("after")).toBe("verified");
	// A green baseline before the edits verified the tree as it already was.
	expect(outcome("baseline")).toBe("shipped");
});

it("does not accept a mention, an ||-guarded run or a piped run as evidence", () => {
	expect(outcome("mention")).toBe("shipped");
	expect(outcome("guarded")).toBe("shipped");
	expect(outcome("piped")).toBe("shipped");
});

it("recognises a verification command only at the head of a shell segment", () => {
	expect(isVerifyCommand("npm test")).toBe(true);
	expect(isVerifyCommand("cd packages/api && pnpm run check")).toBe(true);
	expect(isVerifyCommand("CI=1 npx vitest run")).toBe(true);
	expect(isVerifyCommand("cargo clippy")).toBe(true);
	// The exit status is somebody else's, or there was no run at all:
	expect(isVerifyCommand("npm test || true")).toBe(false);
	expect(isVerifyCommand("npm test 2>&1 | tail -20")).toBe(false);
	expect(isVerifyCommand('rg -n "vitest" src')).toBe(false);
	expect(isVerifyCommand('echo "npm test" >> README.md')).toBe(false);
	expect(isVerifyCommand('git log --grep="npm run build"')).toBe(false);
	expect(isVerifyCommand('git commit -m "make test pass"')).toBe(false);
});
