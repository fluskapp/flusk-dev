/**
 * The prior-run source against real session files on disk — the same writer
 * the history tests use, so this describes flusk's actual transcript format
 * rather than a second approximation of it. Nothing is mocked: the cards come
 * from sessionCards(), the header and handoff from SessionStore.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createRunsSource } from "../src/features/context/source-runs.js";
import type { ContextItem, ContextRequest } from "../src/features/context/types.js";
import { estimateTokens } from "../src/features/history/budget.js";
import { asst, call, res, say, session } from "./history-session-fixtures.js";

const GH = "ghp_ABCDEFGHIJKLMNOP1234";
/** Real paths, not synthetic secrets: the recorded trap is a scrubber that ate them. */
const HANDOFF = `Rewrote src/history/source-sessions.ts and src/fetch.ts; npm test green.
NEXT: wire the backoff into src/client.ts. Token used while debugging: ${GH}`;

let home: string;
let repoRoot: string;
let prev: string | undefined;
let first: string;
let latest: string;

const req = (over: Partial<ContextRequest> = {}): ContextRequest => ({
	task: "finish the retry backoff in src/client.ts",
	repoRoot,
	budgetTokens: 4000,
	isResume: true,
	...over,
});

const gather = (over?: Partial<ContextRequest>, ref?: string) =>
	createRunsSource(ref === undefined ? {} : { sessionRef: ref }).gather(req(over));

const byId = (items: ContextItem[], kind: string): ContextItem | undefined =>
	items.find((i) => i.id.startsWith(`runs:${kind}:`));

beforeAll(async () => {
	prev = process.env.FLUSK_HOME;
	home = mkdtempSync(join(tmpdir(), "flusk-home-runs-"));
	repoRoot = mkdtempSync(join(tmpdir(), "runs-repo-"));
	process.env.FLUSK_HOME = home;
	first = session(repoRoot, "an earlier, unrelated run", [say("done")], "completed");
	latest = session(
		repoRoot,
		"add retries to fetch",
		[
			{ role: "user", content: "go" },
			asst([
				call("t1", "write", { file_path: "src/fetch.ts" }),
				call("t2", "bash", { command: "npm test" }),
			]),
			res("t1", "write", "wrote 40 lines"),
			res("t2", "bash", "12 passed"),
			say(`Tests pass. ${GH}`),
		],
		"completed",
	);
	const { SessionStore } = await import("../src/features/session/session.repository.js");
	const store = SessionStore.open(join(home, "sessions", latest));
	store.appendEntry({
		type: "compaction",
		id: 90,
		summary: HANDOFF,
		firstKeptEntryId: 3,
		tokensBefore: 90000,
	});
	store.close();
});

afterAll(() => {
	if (prev === undefined) delete process.env.FLUSK_HOME;
	else process.env.FLUSK_HOME = prev;
	rmSync(home, { recursive: true, force: true });
	rmSync(repoRoot, { recursive: true, force: true });
});

it("carries the stopping point, the handoff and the work digest of the resumed run", () => {
	const r = gather();
	expect(r.status).toBe("ok");
	expect(r.notes).toEqual([]);
	expect(r.items.map((i) => i.id)).toEqual([
		`runs:state:${latest}`,
		`runs:handoff:${latest}`,
		`runs:digest:${latest}`,
	]);
	const state = byId(r.items, "state")?.body ?? "";
	expect(state).toContain("task: add retries to fetch");
	expect(state).toContain("ended: completed");
	expect(state).toContain("verified after the last edit: yes");
	expect(state).toContain("files written: src/fetch.ts");
	expect(byId(r.items, "digest")?.body).toContain("commands:\nnpm test");
});

it("gives every item a specific why that names the session and the field it came from", () => {
	for (const item of gather().items) {
		expect(item.why.length).toBeGreaterThan(40);
		expect(item.why).toContain(`session ${latest}`);
		expect(item.why).not.toMatch(/relevant to the task/i);
		expect(item.title).toContain("[untrusted: prior-run transcript]");
		expect(item.tier).toBe("ranked");
		expect(item.body.trim()).not.toBe("");
	}
});

it("redacts the compaction handoff, which nothing else on the resume path scrubs", () => {
	const handoff = byId(gather().items, "handoff")?.body ?? "";
	expect(handoff).not.toContain(GH);
	expect(handoff).toContain("[redacted: github token]");
	// The scrubber once ate file paths as high-entropy strings; it must not here.
	expect(handoff).toContain("src/history/source-sessions.ts");
	expect(handoff).toContain("NEXT: wire the backoff into src/client.ts.");
	expect(byId(gather().items, "digest")?.body).not.toContain(GH);
});

it("counts tokens over exactly what is rendered, with the one estimator", () => {
	for (const i of gather().items) {
		expect(i.tokens).toBe(estimateTokens(`${i.title}\n${i.why}\n${i.body}`));
	}
});

it("is byte-identical across rebuilds, and ranks stopping point over handoff over digest", () => {
	expect(JSON.stringify(gather())).toBe(JSON.stringify(gather()));
	const [a, b, c] = gather().items;
	expect((a?.score ?? 0) > (b?.score ?? 0) && (b?.score ?? 0) > (c?.score ?? 0)).toBe(true);
	const bumped = gather({ paths: ["src/fetch.ts"] });
	expect(byId(bumped.items, "state")?.score).toBeGreaterThan(
		byId(gather().items, "state")?.score ?? 1,
	);
});

it("reads the session the resume names, not merely the newest one", () => {
	const id = (first.split("-").pop() ?? "").replace(".jsonl", "");
	const r = gather(undefined, id);
	expect(r.items.map((i) => i.id)).toContain(`runs:state:${first}`);
	expect(r.items.map((i) => i.id)).not.toContain(`runs:state:${latest}`);
});
