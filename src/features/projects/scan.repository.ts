import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { AssistantMsg, ModelRef } from "../run/run.types.js";
import { replayTools } from "../run/replay-tools.js";
import { runVerdict, type Verdict } from "../run/verdict.types.js";
import type { StatsEntry } from "../session/entries.js";
import { fluskHome } from "../../platform/paths/paths.js";
import { SessionStore } from "../session/session.repository.js";
import { createFileCache, type Stamp, stampOf } from "./scan-cache.repository.js";
import { deriveStatus, lastGate, type SessionStatus, statusFromReason } from "./scan-derive.js";

export { deriveStatus } from "./scan-derive.js";
export type { SessionStatus } from "./scan-derive.js";

/**
 * Transcripts a scan will parse, newest first. The dashboard polls this list
 * every few seconds and every entry costs a full JSONL parse, so an archive
 * of thousands must not be re-read to answer "what ran recently?".
 */
const SESSION_LIMIT = 500;

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
	/** Unified verdict (runVerdict over status + last gate entry). ABSENT when
	 * the native Rust scanner answered — its SessionSummary predates verdict —
	 * so consumers fall back to statusToVerdict(status). */
	verdict?: Verdict;
	/** Distinct write/edit paths replayed from message entries. Absent from
	 * native-scanner rows, same caveat as verdict. */
	filesTouched?: number;
	/** Routing kind from the header, when the run recorded one. */
	taskKind?: string;
	/** Present when this session belongs to a subagent (links to its parent). */
	parentSession?: string;
}

export function sessionsRoot(): string {
	return join(fluskHome(), "sessions");
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
		const gate = lastGate(entries);
		const status: SessionStatus =
			gate?.outcome === "blocked"
				? "blocked"
				: stats?.reason !== undefined
					? statusFromReason(stats.reason)
					: deriveStatus(stats !== undefined, lastAssistant);
		return {
			key,
			repoRoot: header.repoRoot,
			task: header.task,
			sessionId: header.id,
			createdAt: header.createdAt,
			updatedAtMs: stamp.mtimeMs,
			status,
			turns: stats?.stats.turns ?? turns,
			costUsd: stats?.stats.usage.costUsd ?? 0,
			model: header.model,
			verdict: runVerdict(status, gate),
			filesTouched: replayTools(entries, header.repoRoot).filesTouched.length,
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
