import type {
	AssistantMsg,
	ModelRef,
	RunEndReason,
	RunStats,
	ToolResultMsg,
} from "./types.js";

export type AhEvent =
	| { type: "run:start"; runId: string; task: string; model: ModelRef }
	| { type: "turn:start"; turn: number }
	| { type: "assistant:delta"; text: string; channel: "text" | "thinking" }
	| { type: "tool:start"; callId: string; name: string; args: unknown }
	| { type: "tool:update"; callId: string; partial: string }
	| { type: "tool:end"; callId: string; name: string; output: string; isError: boolean }
	| { type: "turn:end"; turn: number; message: AssistantMsg; toolResults: ToolResultMsg[] }
	| { type: "compaction"; tokensBefore: number; tokensAfter: number }
	| { type: "run:end"; reason: RunEndReason; stats: RunStats };

type Listener<T extends AhEvent["type"]> = (
	e: Extract<AhEvent, { type: T }>,
) => void | Promise<void>;

/**
 * Listeners are awaited in subscription order, so subscribers (renderer,
 * memory layer, autonomy layer) observe each event before the loop proceeds.
 */
export interface EventBus {
	on<T extends AhEvent["type"]>(type: T, fn: Listener<T>): () => void;
	emit(e: AhEvent): Promise<void>;
}

export function createEventBus(): EventBus {
	const listeners = new Map<string, Set<(e: AhEvent) => void | Promise<void>>>();
	return {
		on(type, fn) {
			let set = listeners.get(type);
			if (!set) {
				set = new Set();
				listeners.set(type, set);
			}
			const untyped = fn as (e: AhEvent) => void | Promise<void>;
			set.add(untyped);
			return () => {
				set.delete(untyped);
			};
		},
		async emit(e) {
			const set = listeners.get(e.type);
			if (!set) return;
			for (const fn of [...set]) {
				await fn(e);
			}
		},
	};
}
