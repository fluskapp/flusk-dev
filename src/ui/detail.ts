import type { AssistantMsg, RunEndReason, RunStats } from "../core/types.js";
import type { HeaderEntry } from "../session/entries.js";
import { SessionStore } from "../session/store.js";
import { deriveStatus, type SessionStatus } from "./scan.js";

export interface ToolView {
	id: string;
	name: string;
	args: unknown;
	output: string | null;
	isError: boolean;
}

export type TranscriptItem =
	| { kind: "user"; text: string }
	| {
			kind: "assistant";
			text: string;
			thinking: string;
			stopReason: string;
			errorMessage?: string;
			tools: ToolView[];
	  }
	| { kind: "compaction"; summary: string };

export interface SessionDetail {
	header: HeaderEntry;
	status: SessionStatus;
	stats: RunStats | null;
	/** Why the run ended, verbatim from the stats entry; older files omit it. */
	reason: RunEndReason | null;
	items: TranscriptItem[];
}

/** Fold a session file into turn-shaped items; tool results join their calls by callId. */
export function loadSessionDetail(path: string): SessionDetail {
	const entries = SessionStore.read(path);
	const header = entries[0];
	if (!header || header.type !== "header") {
		throw new Error(`Session file has no header entry: ${path}`);
	}
	const items: TranscriptItem[] = [];
	const toolIndex = new Map<string, ToolView>();
	let stats: RunStats | null = null;
	let reason: RunEndReason | null = null;
	let lastAssistant: AssistantMsg | undefined;
	for (const e of entries) {
		if (e.type === "stats") {
			stats = e.stats;
			reason = e.reason ?? null;
		} else if (e.type === "compaction") {
			items.push({ kind: "compaction", summary: e.summary });
		} else if (e.type === "message") {
			const m = e.msg;
			if (m.role === "user") {
				items.push({ kind: "user", text: m.content });
			} else if (m.role === "assistant") {
				lastAssistant = m;
				const tools: ToolView[] = [];
				let text = "";
				let thinking = "";
				for (const block of m.content) {
					if (block.type === "text") text += block.text;
					else if (block.type === "thinking") thinking += block.text;
					else {
						const view: ToolView = {
							id: block.id,
							name: block.name,
							args: block.args,
							output: null,
							isError: false,
						};
						tools.push(view);
						toolIndex.set(block.id, view);
					}
				}
				items.push({
					kind: "assistant",
					text,
					thinking,
					stopReason: m.stopReason,
					...(m.errorMessage !== undefined ? { errorMessage: m.errorMessage } : {}),
					tools,
				});
			} else {
				const view = toolIndex.get(m.callId);
				if (view) {
					view.output = m.output;
					view.isError = m.isError;
				}
			}
		}
	}
	return { header, status: deriveStatus(stats !== null, lastAssistant), stats, reason, items };
}
