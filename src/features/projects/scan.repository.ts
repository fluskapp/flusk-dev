import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { AssistantMsg, ModelRef, RunEndReason } from "../run/run.types.js";
import type { StatsEntry } from "../session/entries.js";
import { fluskHome } from "../../platform/paths/paths.js";
import { SessionStore } from "../session/session.repository.js";
import { createFileCache, type Stamp, stampOf } from "./scan-cache.repository.js";

/**
 * Transcripts a scan will parse, newest first. The dashboard polls this list
 * every few seconds and every entry costs a full JSONL parse, so an archive
 * of thousands must not be re-read to answer "what ran recently?".
 */
const SESSION_LIMIT = 500;

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
function statusFromReason(reason: RunEndReason): SessionStatus {
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
	return join(fluskHome(), "sessions");
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

/** Summaries per file identity: an unchanged transcript is never re-parsed. */
const cache = createFileCache<SessionSummary>();

function summarize(path: string, key: string, stamp: Stamp): SessionSummary | null {
	try {
		const entries = SessionStore.read(path);
		const header = entries[0];
		if (!header || header.type !== "header") return null;
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
		return {
			key,
			repoRoot: header.repoRoot,
			task: header.task,
			sessionId: header.id,
			createdAt: header.createdAt,
			updatedAtMs: stamp.mtimeMs,
			status:
				stats?.reason !== undefined
					? statusFromReason(stats.reason)
					: deriveStatus(stats !== undefined, lastAssistant),
			turns: stats?.stats.turns ?? turns,
			costUsd: stats?.stats.usage.costUsd ?? 0,
			model: header.model,
			...(header.taskKind !== undefined ? { taskKind: header.taskKind } : {}),
			...(header.parentSession !== undefined ? { parentSession: header.parentSession } : {}),
		};
	} catch {
		return null; // unreadable/foreign file — not this dashboard's problem
	}
}

/** Every session file with its stamp, newest first, capped. */
function sessionFiles(root: string): { path: string; key: string; stamp: Stamp }[] {
	let slugs: string[] = [];
	try {
		slugs = readdirSync(root);
	} catch {
		return [];
	}
	const found: { path: string; key: string; stamp: Stamp }[] = [];
	for (const slug of slugs) {
		let files: string[] = [];
		try {
			files = readdirSync(join(root, slug)).filter((f) => f.endsWith(".jsonl"));
		} catch {
			continue;
		}
		for (const file of files) {
			const path = join(root, slug, file);
			const stamp = stampOf(path);
			if (stamp !== null) found.push({ path, key: `${slug}/${file}`, stamp });
		}
	}
	return found.sort((a, b) => b.stamp.mtimeMs - a.stamp.mtimeMs).slice(0, SESSION_LIMIT);
}

export function scanSessions(): SessionSummary[] {
	const out: SessionSummary[] = [];
	for (const { path, key, stamp } of sessionFiles(sessionsRoot())) {
		const summary = cache.get(path, stamp, () => summarize(path, key, stamp));
		if (summary !== null) out.push(summary);
	}
	return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
