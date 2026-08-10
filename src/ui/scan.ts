import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { AssistantMsg, ModelRef, RunEndReason } from "../core/types.js";
import type { StatsEntry } from "../session/entries.js";
import { ahHome } from "../session/paths.js";
import { SessionStore } from "../session/store.js";

export type SessionStatus = "completed" | "error" | "aborted" | "stopped" | "running";

export interface SessionSummary {
	key: string; // "<repo-slug>/<file>.jsonl" — the handle the UI uses
	repoRoot: string;
	task: string;
	sessionId: string;
	createdAt: string;
	updatedAtMs: number;
	status: SessionStatus;
	turns: number;
	costUsd: number;
	model: ModelRef;
	/** Routing kind from the header, when the run recorded one. */
	taskKind?: string;
	/** Present when this session belongs to a subagent (links to its parent). */
	parentSession?: string;
}

/** Newer files persist the RunEndReason in the stats entry; map it directly. */
export function statusFromReason(reason: RunEndReason): SessionStatus {
	switch (reason) {
		case "completed":
			return "completed";
		case "error":
			return "error";
		case "aborted":
			return "aborted";
		default:
			return "stopped"; // budget/maxTurns/deadline
	}
}

export function sessionsRoot(): string {
	return join(ahHome(), "sessions");
}

/** The session file doesn't persist RunEndReason; derive a display status. */
export function deriveStatus(
	hasStats: boolean,
	lastAssistant: AssistantMsg | undefined,
): SessionStatus {
	if (!hasStats) return "running";
	switch (lastAssistant?.stopReason) {
		case "end":
			return "completed";
		case "error":
			return "error";
		case "aborted":
			return "aborted";
		default:
			return "stopped"; // ended on toolUse: maxTurns/deadline/budget
	}
}

export function scanSessions(): SessionSummary[] {
	const root = sessionsRoot();
	const out: SessionSummary[] = [];
	let slugs: string[] = [];
	try {
		slugs = readdirSync(root);
	} catch {
		return out;
	}
	for (const slug of slugs) {
		let files: string[] = [];
		try {
			files = readdirSync(join(root, slug)).filter((f) => f.endsWith(".jsonl"));
		} catch {
			continue;
		}
		for (const file of files) {
			const path = join(root, slug, file);
			try {
				const entries = SessionStore.read(path);
				const header = entries[0];
				if (!header || header.type !== "header") continue;
				let stats: StatsEntry | undefined;
				let lastAssistant: AssistantMsg | undefined;
				let turns = 0;
				for (const e of entries) {
					if (e.type === "stats") stats = e;
					if (e.type === "message" && e.msg.role === "assistant") {
						lastAssistant = e.msg;
						turns++;
					}
				}
				out.push({
					key: `${slug}/${file}`,
					repoRoot: header.repoRoot,
					task: header.task,
					sessionId: header.id,
					createdAt: header.createdAt,
					updatedAtMs: statSync(path).mtimeMs,
					status:
						stats?.reason !== undefined
							? statusFromReason(stats.reason)
							: deriveStatus(stats !== undefined, lastAssistant),
					turns: stats?.stats.turns ?? turns,
					costUsd: stats?.stats.usage.costUsd ?? 0,
					model: header.model,
					...(header.taskKind !== undefined ? { taskKind: header.taskKind } : {}),
					...(header.parentSession !== undefined ? { parentSession: header.parentSession } : {}),
				});
			} catch {
				// unreadable/foreign file — not this dashboard's problem
			}
		}
	}
	return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
