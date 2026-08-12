/**
 * Real session files on disk, for the tests that read them back as cards.
 * Shared so the transcript-shape tests and the "verified is expensive" tests
 * describe the same file format rather than two approximations of it.
 */
import { basename } from "node:path";
import type {
	AssistantBlock,
	AssistantMsg,
	ModelRef,
	Msg,
	RunEndReason,
	StopReason,
	ToolResultMsg,
} from "../src/features/run/run.types.js";
import { zeroUsage } from "../src/features/run/run.types.js";
import { SESSION_VERSION } from "../src/features/session/entries.js";
import { newSessionPath, repoSlug } from "../src/platform/paths/paths.js";
import { SessionStore } from "../src/features/session/session.repository.js";

export const model: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200000 };

export const asst = (c: AssistantBlock[], stopReason: StopReason = "toolUse"): AssistantMsg => ({
	role: "assistant",
	content: c,
	stopReason,
	usage: zeroUsage(),
});
export const say = (t: string): AssistantMsg => asst([{ type: "text", text: t }], "end");
export const call = (id: string, name: string, args: unknown): AssistantBlock => ({
	type: "toolCall",
	id,
	name,
	args,
});
export const res = (id: string, name: string, output: string, isError = false): ToolResultMsg => ({
	role: "toolResult",
	callId: id,
	name,
	output,
	isError,
});

let clock = 0;

/**
 * Writes a real session file, returning its key (the card's `ref`). `reason`
 * omitted = an older transcript whose stats entry has no RunEndReason;
 * `"none"` = no stats entry at all, i.e. the run is still going.
 */
export function session(
	repoRoot: string,
	task: string,
	msgs: Msg[],
	reason?: RunEndReason | "none",
): string {
	const id = `s${++clock}`;
	const at = new Date(Date.UTC(2026, 7, clock, 12));
	const createdAt = at.toISOString();
	const path = newSessionPath(repoRoot, id, at);
	const store = SessionStore.open(path);
	const head = { version: SESSION_VERSION, id, task, repoRoot, gitBranch: null, model, createdAt };
	store.appendEntry({ type: "header", ...head });
	let n = 1;
	for (const msg of msgs) store.appendEntry({ type: "message", id: n++, msg });
	if (reason !== "none") {
		const stats = { turns: 1, usage: zeroUsage(), startedAt: createdAt };
		store.appendEntry({ type: "stats", id: n, stats, ...(reason ? { reason } : {}) });
	}
	store.close();
	return `${repoSlug(repoRoot)}/${basename(path)}`;
}
