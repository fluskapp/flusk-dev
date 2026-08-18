/**
 * replayTools must survive foreign session files whose header lacks repoRoot:
 * without a cwd the raw recorded paths are counted as-is, and the scan keeps
 * the row instead of dropping the whole session (the native scanner treats
 * repo_root as optional, so the TS scan must not diverge by vanishing rows).
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { replayTools } from "../src/features/run/replay-tools.js";
import type { SessionEntry } from "../src/features/session/entries.js";
import { tree, write } from "./project-fixture.js";

const MODEL = { provider: "fake", id: "fake-1", contextWindow: 200_000 };
const usage = { input: 1, output: 1, cacheRead: 0, costUsd: 0 };

const pair = (id: number, callId: string, name: string, args: unknown): SessionEntry[] => [
	{
		type: "message",
		id,
		msg: { role: "assistant", content: [{ type: "toolCall", id: callId, name, args }], stopReason: "toolUse", usage },
	},
	{ type: "message", id: id + 1, msg: { role: "toolResult", callId, name, output: "wrote", isError: false } },
];

let t: ReturnType<typeof tree>;
beforeAll(() => {
	t = tree();
});
afterAll(() => t.cleanup());

it("counts raw paths, deduplicated, when no cwd is known", () => {
	const entries = [
		...pair(1, "w1", "write", { file_path: "notes.md" }),
		...pair(3, "w2", "edit", { file_path: "notes.md" }),
		...pair(5, "w3", "write", { file_path: "src/app.ts" }),
	];
	const replayed = replayTools(entries, undefined);
	expect(replayed.filesTouched).toEqual(["notes.md", "src/app.ts"]);
});

it("a foreign session file with no header repoRoot still yields a scan row", () => {
	const lines: SessionEntry[] = [
		{
			type: "header",
			version: 1,
			id: "foreign-1",
			task: "foreign run",
			gitBranch: null,
			model: MODEL,
			createdAt: "2026-08-01T00:00:00.000Z",
		} as unknown as SessionEntry, // deliberately missing repoRoot
		...pair(1, "w1", "write", { file_path: "notes.md" }),
		{ type: "stats", id: 3, stats: { turns: 1, usage, startedAt: "2026-08-01T00:00:00.000Z" }, reason: "completed" },
	];
	write(t.home, "sessions/foreign/one.jsonl", `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`);
	const row = scanSessions().find((s) => s.task === "foreign run");
	expect(row).toBeDefined();
	expect(row?.status).toBe("completed");
	expect(row?.filesTouched).toBe(1);
});
