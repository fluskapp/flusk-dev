import type {
	AssistantMsg,
	ModelRef,
	RunEndReason,
	RunStats,
	ToolResultMsg,
} from "./types.js";

export type HitEvent =
	| { type: "run:start"; runId: string; task: string; model: ModelRef }
	| { type: "turn:start"; turn: number }
	| { type: "assistant:delta"; text: string; channel: "text" | "thinking" }
	| { type: "tool:start"; callId: string; name: string; args: unknown }
	| { type: "tool:update"; callId: string; partial: string }
	| { type: "tool:end"; callId: string; name: string; output: string; isError: boolean }
	| { type: "turn:end"; turn: number; message: AssistantMsg; toolResults: ToolResultMsg[] }
	| { type: "compaction"; tokensBefore: number; tokensAfter: number }
	| { type: "run:end"; reason: RunEndReason; stats: RunStats };

type Listener<T extends HitEvent["type"]> = (
	e: Extract<HitEvent, { type: T }>,
) => void | Promise<void>;

/**
 * Listeners are awaited in subscription order, so subscribers (renderer,
 * memory layer, autonomy layer) observe each event before the loop proceeds.
 */
export interface EventBus {
	on<T extends HitEvent["type"]>(type: T, fn: Listener<T>): () => void;
	emit(e: HitEvent): Promise<void>;
}

export function createEventBus(): EventBus {
	const listeners = new Map<string, Set<(e: HitEvent) => void | Promise<void>>>();
	return {
		on(type, fn) {
			let set = listeners.get(type);
			if (!set) {
				set = new Set();
				listeners.set(type, set);
			}
			const untyped = fn as (e: HitEvent) => void | Promise<void>;
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
