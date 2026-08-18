/**
 * The transcript's mutators and the live-state vocabulary, apart from the hook
 * so use-chat stays under the file cap. Everything here is pure over its
 * arguments — the hook keeps repaint().
 */
import { chatClock, type ChatMsg } from "./chat-model.js";

/** Activity lines kept on screen while a reply runs; older ones scroll off. */
export const TOOL_MAX = 6;

export interface ChatLive {
	phase: "idle" | "starting" | "waiting" | "streaming";
	/** Date.now() at send; 0 while idle. */
	startedAt: number;
	/** Last TOOL_MAX (6) activity labels, oldest first. */
	tools: string[];
	/** The backend the in-flight turn runs on ("" while idle). */
	backend: string;
}

/** Grow the streaming assistant turn, opening one when the last turn is not it. */
export function appendDelta(msgs: ChatMsg[], text: string): void {
	let last = msgs[msgs.length - 1];
	if (last === undefined || last.role !== "assistant" || last.err === true) {
		last = { role: "assistant", content: "", at: chatClock() };
		msgs.push(last);
	}
	last.content += text;
}

/** Failures are RENDER-ONLY: chatBody() drops flagged turns from the request. */
export function pushError(msgs: ChatMsg[], message: string): void {
	const last = msgs[msgs.length - 1];
	if (last !== undefined && last.role === "assistant" && last.content === "" && last.err !== true) {
		msgs.pop();
	}
	msgs.push({ role: "assistant", content: message, err: true, at: chatClock() });
}

/** Record one tool invocation, keeping only the newest TOOL_MAX labels. */
export function pushTool(live: ChatLive, label: string): void {
	live.tools.push(label);
	if (live.tools.length > TOOL_MAX) live.tools.splice(0, live.tools.length - TOOL_MAX);
}

/** Back to rest: the turn is over (done, error, or Stop). */
export function resetLive(live: ChatLive): void {
	live.phase = "idle";
	live.startedAt = 0;
	live.tools = [];
	live.backend = "";
}

/**
 * The state line as three parts — before, the counting seconds, after — so
 * ChatStatus can put the counter in its own code-font span. Idle is all-empty.
 */
export function stateParts(live: ChatLive, now: number): [string, string, string] {
	if (live.phase === "starting") return [`starting ${live.backend}…`, "", ""];
	const sec = `${Math.max(0, Math.floor((now - live.startedAt) / 1000))}s`;
	if (live.phase === "waiting") return ["waiting for first output… (", sec, ")"];
	if (live.phase === "streaming") return ["streaming (", sec, ")"];
	return ["", "", ""];
}

export function stateText(live: ChatLive, now: number): string {
	return stateParts(live, now).join("");
}
