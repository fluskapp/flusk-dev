import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { Msg } from "../src/core/types.js";
import { sessionCards } from "../src/history/source-sessions.js";
import { asst, call, res, say, session } from "./history-session-fixtures.js";

const GH = "ghp_ABCDEFGHIJKLMNOP1234";

let home: string;
let repoRoot: string;
let prevHome: string | undefined;

/** Edits FIRST, then the verification: the only order that proves anything. */
const passingRun = (report: string): Msg[] => [
	{ role: "user", content: "go" },
	asst([
		call("t1", "write", { file_path: "src/fetch.ts" }),
		call("t2", "bash", { command: "npm test" }),
	]),
	res("t1", "write", "wrote 40 lines"),
	res("t2", "bash", "12 passed"),
	say(report),
];

let keys: Record<string, string>;
const card = (name: string) => sessionCards().find((c) => c.ref === keys[name]);

beforeAll(() => {
	prevHome = process.env.AH_HOME;
	home = mkdtempSync(join(tmpdir(), "ah-home-"));
	repoRoot = mkdtempSync(join(tmpdir(), "linof-base-"));
	process.env.AH_HOME = home;
	keys = {
		verified: session(
			repoRoot,
			"add retries to fetch",
			passingRun(`Tests pass. ${GH}`),
			"completed",
		),
		noReason: session(repoRoot, "old file", passingRun("done")),
		shipped: session(
			repoRoot,
			"tidy the client",
			[
				asst([call("t1", "bash", { command: "npm test" })]),
				res("t1", "bash", "1 failing\n[exit code 1]"),
				say("Left the suite red."),
			],
			"completed",
		),
		failed: session(repoRoot, `crash on ${GH}`, [say("boom")], "error"),
		denied: session(
			repoRoot,
			"rm the world",
			[
				asst([call("t1", "bash", { command: "rm -rf /" })]),
				res("t1", "bash", "denied: destructive command", true),
			],
			"budget",
		),
		aborted: session(repoRoot, "interrupted", [say("half")], "aborted"),
		running: session(repoRoot, "still going", [say("thinking")], "none"),
	};
});

afterAll(() => {
	if (prevHome === undefined) delete process.env.AH_HOME;
	else process.env.AH_HOME = prevHome;
	rmSync(home, { recursive: true, force: true });
	rmSync(repoRoot, { recursive: true, force: true });
});

it("maps every session ending, and earns 'verified' only when it is earned", () => {
	expect(card("verified")?.outcome).toBe("verified");
	expect(card("noReason")?.outcome).toBe("shipped"); // passed, but no persisted reason
	expect(card("shipped")?.outcome).toBe("shipped"); // completed, verify exited non-zero
	expect(card("failed")?.outcome).toBe("failed");
	expect(card("denied")?.outcome).toBe("blocked");
	expect(card("aborted")?.outcome).toBe("blocked");
	expect(card("running")?.outcome).toBe("unknown");
});

it("builds the card from task, report, commands and files touched", () => {
	const c = card("verified");
	expect(c?.kind).toBe("session");
	expect(c?.id).toBe(`session:${keys.verified}`);
	expect(c?.title).toBe("add retries to fetch");
	expect(c?.at).toBe("2026-08-01T12:00:00.000Z");
	expect(c?.paths).toEqual(["src/fetch.ts"]);
	expect(c?.text).toContain("add retries to fetch");
	expect(c?.text).toContain("commands:\nnpm test");
	expect(c?.text).toContain("files:\nsrc/fetch.ts");
});

it("scrubs secrets out of the report and the title", () => {
	expect(card("verified")?.text).not.toContain(GH);
	expect(card("verified")?.text).toContain("[redacted: github token]");
	expect(card("failed")?.title).toBe("crash on [redacted: github token]");
});
