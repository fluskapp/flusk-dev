/**
 * The paths where the prior run is missing, half-readable or gone. These are
 * the normal outcomes (L7), not the exceptional ones: a resume must still
 * start, and a thin block must say WHY it is thin (L2). Real corrupt files on
 * disk — a torn transcript and a message entry with no message — because the
 * only interesting question is what the real readers do with them.
 */
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createRunsSource } from "../src/context/source-runs.js";
import type { ContextRequest } from "../src/context/types.js";
import { sessionsDir } from "../src/session/paths.js";
import { say, session } from "./history-session-fixtures.js";

let home: string;
let prev: string | undefined;
/** One repo per failure mode: a shared sessions dir would blur which broke. */
let quiet: string;
let cardless: string;
let torn: string;
let cardlessKey: string;

const req = (repoRoot: string, isResume = true): ContextRequest => ({
	task: "keep going",
	repoRoot,
	budgetTokens: 2000,
	isResume,
});

const gather = (r: ContextRequest) => createRunsSource().gather(r);

beforeAll(() => {
	prev = process.env.AH_HOME;
	home = mkdtempSync(join(tmpdir(), "ah-home-degrade-"));
	quiet = mkdtempSync(join(tmpdir(), "runs-quiet-"));
	cardless = mkdtempSync(join(tmpdir(), "runs-cardless-"));
	torn = mkdtempSync(join(tmpdir(), "runs-torn-"));
	process.env.AH_HOME = home;
	cardlessKey = session(cardless, "half-written run", [say("partway")], "aborted");
	// Valid JSON, invalid entry: loadSessionDetail dereferences `msg` and dies,
	// so the index has no card while the header and handoff still read fine.
	appendFileSync(
		join(home, "sessions", cardlessKey),
		`${JSON.stringify({ type: "message", id: 9 })}\n`,
	);
	const dir = sessionsDir(torn);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "2026-08-01T00-00-00-000Z-bad.jsonl"), "not json at all\n{}\n");
});

afterAll(() => {
	if (prev === undefined) delete process.env.AH_HOME;
	else process.env.AH_HOME = prev;
	for (const d of [home, quiet, cardless, torn]) rmSync(d, { recursive: true, force: true });
});

it("skips a run that is not a resume, and says so rather than going silent", () => {
	const r = gather(req(quiet, false));
	expect(r.status).toBe("skipped");
	expect(r.items).toEqual([]);
	expect(r.notes[0]).toContain("not a resume");
});

it("skips a repo that has never had a session, with the reason", () => {
	const r = gather(req(quiet));
	expect(r.status).toBe("skipped");
	expect(r.items).toEqual([]);
	expect(r.notes.join(" ")).toContain("No session transcript exists for this repo");
});

it("degrades to partial when the transcript reads but the index has no card", () => {
	const r = gather(req(cardless));
	expect(r.status).toBe("partial");
	expect(r.notes.join(" ")).toContain(`no card for session ${cardlessKey}`);
	expect(r.items.map((i) => i.id)).toEqual([`runs:state:${cardlessKey}`]);
	const body = r.items[0]?.body ?? "";
	expect(body).toContain("task: half-written run");
	expect(body).toContain("outcome: unknown — no history card for this session");
	// What is unknown is named as unknown: a run that wrote nothing and a run
	// whose record we could not read must not read the same.
	expect(body).toContain("verified after the last edit: unknown");
	expect(body).not.toContain("files written:");
	expect(r.items[0]?.why ?? "").toContain(`session ${cardlessKey}`);
});

it("fails as a value, not a throw, when the transcript is torn and no card exists", () => {
	const r = gather(req(torn));
	expect(r.status).toBe("failed");
	expect(r.items).toEqual([]);
	expect(r.notes[0]).toContain("unreadable");
	expect(r.notes[0]).toContain("bad.jsonl");
});

it("never throws, whatever the repoRoot is", () => {
	for (const root of ["/nonexistent/repo/root", "", quiet]) {
		expect(() => gather(req(root))).not.toThrow();
	}
	expect(gather(req("/nonexistent/repo/root")).items).toEqual([]);
});

it("leaks no absolute path into a rendered field", () => {
	for (const item of gather(req(cardless)).items) {
		for (const field of [item.title, item.why, item.body, item.path ?? ""]) {
			expect(field).not.toContain(home);
			expect(field).not.toContain(tmpdir());
		}
	}
});
