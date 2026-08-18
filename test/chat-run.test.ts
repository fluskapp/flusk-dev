/**
 * The expander's pure logic: the collapsed label, chunk recording, the attach
 * rule, and the persisted-record mapping. No DOM — ChatTurnRun renders
 * straight from these.
 */
import { expect, it } from "vitest";
import type { ChatChunk } from "../src/features/chat/types.js";
import type { ChatMsg, ChatRun } from "../src/ui/react/chat/chat-model.js";
import { applyChunk, attachRun, newRun, runFromRecord, runLabel } from "../src/ui/react/chat/chat-run.js";
import type { ChatLive } from "../src/ui/react/chat/chat-turns.js";

const live = (): ChatLive => ({ phase: "waiting", startedAt: 1, tools: [], backend: "claude" });

it("composes the collapsed line, omitting absent fields", () => {
	const run: ChatRun = {
		cmd: "claude -p --output-format stream-json --verbose <prompt>",
		cwd: "/w",
		tools: ["Read a.ts", "Bash ls", "Read b.ts"],
		costUsd: 0.0213778,
		durationMs: 5394,
	};
	expect(runLabel(run)).toBe("claude -p · 3 tools · $0.021 · 5s");
	expect(runLabel({ cmd: "codex exec <prompt>", tools: [] })).toBe("codex exec");
	// The elided prompt never rides into the label; one tool reads singular.
	expect(runLabel({ cmd: "echo-cli <prompt>", tools: ["Bash ls"] })).toBe("echo-cli · 1 tool");
});

it("applyChunk records cmd/tool/stats/error uncapped and returns the meta id", () => {
	const msgs: ChatMsg[] = [];
	const l = live();
	const run = newRun();
	const feed: ChatChunk[] = [
		{ type: "meta", conversationId: "c1" },
		{ type: "cmd", line: "claude -p <prompt>", cwd: "/w" },
		...Array.from({ length: 8 }, (_, i): ChatChunk => ({ type: "tool", label: `Read f${i}.ts` })),
		{ type: "delta", text: "hi" },
		{ type: "stats", costUsd: 0.5, durationMs: 2000, turns: 2 },
		{ type: "done" },
	];
	const ids = feed.map((c) => applyChunk(msgs, l, run, c));
	expect(ids[0]).toBe("c1");
	expect(ids.slice(1).every((id) => id === null)).toBe(true);
	expect(run).toMatchObject({ cmd: "claude -p <prompt>", cwd: "/w", costUsd: 0.5, turns: 2 });
	// The live view caps at 6; the run record keeps every tool line.
	expect(l.tools).toHaveLength(6);
	expect(run.tools).toHaveLength(8);
	expect(msgs.at(-1)).toMatchObject({ role: "assistant", content: "hi" });
});

it("an error chunk lands as the stderr tail and the err line", () => {
	const msgs: ChatMsg[] = [];
	const run = newRun();
	applyChunk(msgs, live(), run, { type: "cmd", line: "claude -p <prompt>", cwd: "/w" });
	applyChunk(msgs, live(), run, { type: "error", message: "exited 1: boom" });
	expect(run.stderr).toBe("exited 1: boom");
	expect(msgs.at(-1)).toMatchObject({ err: true, content: "exited 1: boom" });
	attachRun(msgs, run);
	expect(msgs.at(-1)?.run).toBe(run);
});

it("attachRun skips user tails and runs with nothing to show", () => {
	const user: ChatMsg[] = [{ role: "user", content: "hi", at: "10:00" }];
	const withCmd = { ...newRun(), cmd: "claude -p <prompt>" };
	attachRun(user, withCmd);
	expect(user[0]?.run).toBeUndefined();
	// An HTTP reply records nothing — cwd/stderr alone earn no expander.
	const msgs: ChatMsg[] = [{ role: "assistant", content: "a", at: "10:01" }];
	attachRun(msgs, { ...newRun(), cwd: "/w", stderr: "x" });
	expect(msgs[0]?.run).toBeUndefined();
});

it("maps a persisted record to the expander shape, or null when bare", () => {
	expect(
		runFromRecord({
			role: "assistant", content: "ok", at: "2026-08-17T10:00:02.000Z",
			cmd: "claude -p <prompt>", cwd: "/w", tools: ["Read a.ts"],
			costUsd: 0.02, durationMs: 5000, turns: 2,
		}),
	).toEqual({
		cmd: "claude -p <prompt>", cwd: "/w", tools: ["Read a.ts"],
		costUsd: 0.02, durationMs: 5000, turns: 2,
	});
	// A user turn carries cwd for the record, not for an expander.
	expect(
		runFromRecord({ role: "user", content: "hi", at: "t", backendId: "claude", cwd: "/w" }),
	).toBeNull();
	// An errored turn's content doubles as the raw failure text inside.
	expect(
		runFromRecord({ role: "assistant", content: "exited 1", at: "t", err: true, cmd: "claude -p" }),
	).toMatchObject({ cmd: "claude -p", stderr: "exited 1" });
});
