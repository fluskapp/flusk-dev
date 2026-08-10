import { appendFileSync, existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AssistantMsg, ModelRef, Msg, ToolResultMsg, UserMsg } from "../src/core/types.js";
import { ahHome, repoSlug, sessionsDir } from "../src/session/paths.js";
import { Session } from "../src/session/session.js";
import { SessionStore } from "../src/session/store.js";

const model: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200000 };

let home: string;
let repoRoot: string;
let prevHome: string | undefined;

beforeEach(async () => {
	prevHome = process.env.AH_HOME;
	home = await mkdtemp(join(tmpdir(), "ah-home-"));
	repoRoot = await mkdtemp(join(tmpdir(), "ah-repo-"));
	process.env.AH_HOME = home;
});

afterEach(async () => {
	if (prevHome === undefined) delete process.env.AH_HOME;
	else process.env.AH_HOME = prevHome;
	await rm(home, { recursive: true, force: true });
	await rm(repoRoot, { recursive: true, force: true });
});

function userMsg(n: number): UserMsg {
	return { role: "user", content: `message ${n}` };
}

describe("Session", () => {
	it("round-trips messages and header through JSONL replay", () => {
		const s = Session.create({ task: "fix the bug", repoRoot, model, now: new Date() });
		const user: UserMsg = { role: "user", content: "fix the bug" };
		const assistant: AssistantMsg = {
			role: "assistant",
			content: [
				{ type: "text", text: "Reading the file." },
				{ type: "toolCall", id: "call_1", name: "read", args: { path: "a.ts" } },
			],
			stopReason: "toolUse",
			usage: { input: 10, output: 5, cacheRead: 0, costUsd: 0.001 },
		};
		const toolResult: ToolResultMsg = {
			role: "toolResult",
			callId: "call_1",
			name: "read",
			output: "file contents",
			isError: false,
		};
		const msgs: Msg[] = [user, assistant, toolResult];
		for (const m of msgs) s.appendMessage(m);
		const header = s.header;
		s.close();

		const loaded = Session.load(s.path);
		expect(loaded.buildContext()).toEqual(msgs);
		expect(loaded.header).toEqual(header);
		expect(loaded.id).toBe(header.id);
		expect(loaded.entries).toEqual(s.entries);
		loaded.close();
	});

	it("buildContext honors the last compaction entry", () => {
		const s = Session.create({ task: "t", repoRoot, model });
		const ids = Array.from({ length: 5 }, (_, i) => s.appendMessage(userMsg(i + 1)).id);
		expect(ids).toEqual([1, 2, 3, 4, 5]);
		// keep the last 2 messages (ids 4 and 5)
		s.appendCompaction({ summary: "did stuff", firstKeptEntryId: 4, tokensBefore: 9000 });
		s.appendMessage(userMsg(6));
		s.close();

		const ctx = Session.load(s.path).buildContext();
		expect(ctx).toEqual([
			{ role: "user", content: "Summary of earlier work:\ndid stuff" },
			userMsg(4),
			userMsg(5),
			userMsg(6),
		]);
	});

	it("throws with the line number on a malformed interior line", () => {
		const s = Session.create({ task: "t", repoRoot, model });
		s.appendMessage(userMsg(1));
		s.close();
		appendFileSync(s.path, "{not json\n");
		appendFileSync(s.path, `${JSON.stringify({ type: "message", id: 2, msg: userMsg(2) })}\n`);
		expect(() => SessionStore.read(s.path)).toThrow(/line 3/);
		expect(() => Session.load(s.path)).toThrow(/line 3/);
	});

	it("drops a torn final line (crash mid-append) and still loads", () => {
		const s = Session.create({ task: "t", repoRoot, model });
		s.appendMessage(userMsg(1));
		s.close();
		appendFileSync(s.path, '{"type":"message","id":2,"msg":{"role":"user","con');
		const entries = SessionStore.read(s.path);
		expect(entries).toHaveLength(2); // header + the synced message only
		const loaded = Session.load(s.path);
		expect(loaded.buildContext()).toEqual([userMsg(1)]);
		loaded.close();
	});

	it("stores files under AH_HOME/sessions/<slug> with a stable slug", async () => {
		const s = Session.create({ task: "t", repoRoot, model });
		s.close();
		const dir = sessionsDir(repoRoot);
		expect(ahHome()).toBe(home);
		expect(dir.startsWith(join(home, "sessions") + sep)).toBe(true);
		expect(s.path.startsWith(dir + sep)).toBe(true);
		expect(s.path.endsWith(`-${s.id}.jsonl`)).toBe(true);
		expect(existsSync(s.path)).toBe(true);

		expect(repoSlug(repoRoot)).toBe(repoSlug(repoRoot));
		expect(repoSlug(repoRoot)).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
		const otherRepo = await mkdtemp(join(tmpdir(), "ah-Other Repo!-"));
		try {
			expect(repoSlug(otherRepo)).not.toBe(repoSlug(repoRoot));
			expect(repoSlug(otherRepo)).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
		} finally {
			await rm(otherRepo, { recursive: true, force: true });
		}
	});
});
