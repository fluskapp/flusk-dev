import { maybeCompact } from "../compaction/compact.js";
import type { Provider } from "../provider/provider.js";
import type { Session } from "../session/session.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolContext } from "../tools/tool.js";
import { dispatchToolCalls } from "./dispatch.js";
import type { EventBus } from "./events.js";
import type { SteeringQueue } from "./steering.js";
import type { AssistantMsg, ModelRef, Msg, RunEndReason, ToolCall, Usage } from "./types.js";
import { addUsage, zeroUsage } from "./types.js";

export interface TurnDeps {
	provider: Provider;
	model: ModelRef;
	registry: ToolRegistry;
	session: Session;
	events: EventBus;
	steering: SteeringQueue;
	baseSystem: string;
	toolCtx: ToolContext;
	signal: AbortSignal;
	runId: string;
	repoPath: string;
	task: string;
	/** Goal this run serves, if any. */
	goalId?: string;
	isResume: boolean;
	/** Enables context compaction; absent = never compact (bare test loops). */
	compaction?: {
		summarizeModel: ModelRef;
		reserveTokens: number;
		keepRecentTokens: number;
	};
}

export interface TurnState {
	context: Msg[];
	turn: number;
	usage: Usage;
}

function record(deps: TurnDeps, state: TurnState, msg: Msg): void {
	deps.session.appendMessage(msg);
	state.context.push(msg);
}

/** Runs one turn. Returns the run end reason, or null to continue looping. */
export async function runTurn(deps: TurnDeps, state: TurnState): Promise<RunEndReason | null> {
	for (const msg of deps.steering.drain()) {
		record(deps, state, msg);
	}
	await deps.events.emit({ type: "turn:start", turn: state.turn });
	if (deps.compaction) {
		// Best-effort: a compaction failure must never take the run down.
		try {
			await maybeCompact(
				{
					provider: deps.provider,
					contextWindow: deps.model.contextWindow,
					session: deps.session,
					events: deps.events,
					signal: deps.signal,
					...deps.compaction,
				},
				state,
			);
		} catch {
			// skip compaction this turn and continue with the full context
		}
	}

	let message: AssistantMsg | undefined;
	const req = {
		model: deps.model,
		system: deps.baseSystem,
		messages: [...state.context],
		tools: deps.registry.schemas(),
	};
	for await (const ev of deps.provider.stream(req, deps.signal)) {
		if (ev.type === "text_delta") {
			await deps.events.emit({ type: "assistant:delta", text: ev.text, channel: "text" });
		} else if (ev.type === "thinking_delta") {
			await deps.events.emit({ type: "assistant:delta", text: ev.text, channel: "thinking" });
		} else if (ev.type === "done") {
			message = ev.message;
		}
	}
	if (!message) {
		// Defensive: the Provider contract guarantees a done event; treat absence as error.
		message = {
			role: "assistant",
			content: [],
			stopReason: "error",
			errorMessage: "provider stream ended without a done message",
			usage: zeroUsage(),
		};
	}
	record(deps, state, message);
	state.usage = addUsage(state.usage, message.usage);

	if (message.stopReason === "error" || message.stopReason === "aborted") {
		await deps.events.emit({ type: "turn:end", turn: state.turn, message, toolResults: [] });
		return message.stopReason;
	}
	if (message.stopReason === "maxTokens") {
		// A truncated response is not success; surface it as an error end.
		await deps.events.emit({ type: "turn:end", turn: state.turn, message, toolResults: [] });
		return "error";
	}
	const calls = message.content.filter((b): b is ToolCall => b.type === "toolCall");
	if (calls.length === 0) {
		const pending = deps.steering.drain();
		if (pending.length === 0) {
			await deps.events.emit({ type: "turn:end", turn: state.turn, message, toolResults: [] });
			return "completed";
		}
		// Steering arrived mid-turn: record it and keep looping so it is acted on.
		for (const msg of pending) {
			record(deps, state, msg);
		}
		await deps.events.emit({ type: "turn:end", turn: state.turn, message, toolResults: [] });
		return null;
	}
	const results = await dispatchToolCalls(calls, deps.registry, deps.toolCtx, deps.events);
	for (const result of results) {
		record(deps, state, result);
	}
	await deps.events.emit({ type: "turn:end", turn: state.turn, message, toolResults: results });
	return null;
}
