import type { Msg, ToolCall, ToolResultMsg } from "../run/run.types.js";
import type { Session } from "./session-file.repository.js";

/**
 * Repairs a resumed context whose final assistant message has toolCall blocks
 * with no recorded results (the run died mid-dispatch). Appends a synthetic
 * isError result for each unanswered call so providers see a well-formed
 * transcript. Pure: returns the input array untouched when nothing dangles.
 */
export function repairDanglingToolCalls(msgs: Msg[]): Msg[] {
	let lastAssistantIdx = -1;
	for (let i = msgs.length - 1; i >= 0; i--) {
		if (msgs[i]?.role === "assistant") {
			lastAssistantIdx = i;
			break;
		}
	}
	if (lastAssistantIdx === -1) return msgs;
	const assistant = msgs[lastAssistantIdx];
	if (assistant?.role !== "assistant") return msgs;
	const calls = assistant.content.filter((b): b is ToolCall => b.type === "toolCall");
	if (calls.length === 0) return msgs;
	const answered = new Set<string>();
	for (const msg of msgs.slice(lastAssistantIdx + 1)) {
		if (msg.role === "toolResult") answered.add(msg.callId);
	}
	const synthetic: ToolResultMsg[] = calls
		.filter((call) => !answered.has(call.id))
		.map((call) => ({
			role: "toolResult",
			callId: call.id,
			name: call.name,
			output: "[interrupted — no result recorded]",
			isError: true,
		}));
	return synthetic.length === 0 ? msgs : [...msgs, ...synthetic];
}

/**
 * Resume bootstrap: rebuilds the context, persists any synthetic repair
 * results as new session entries, then appends the optional steer message
 * as a fresh user message. Returns the ready-to-run context.
 */
export function prepareResumeContext(session: Session, steer?: string): Msg[] {
	const context = session.buildContext();
	for (const msg of repairDanglingToolCalls(context).slice(context.length)) {
		session.appendMessage(msg);
		context.push(msg);
	}
	if (steer !== undefined) {
		const steerMsg: Msg = { role: "user", content: steer };
		session.appendMessage(steerMsg);
		context.push(steerMsg);
	}
	return context;
}
