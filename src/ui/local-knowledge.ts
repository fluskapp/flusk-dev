/**
 * What ah knows about a repo WITHOUT abagraph: everything derivable from its
 * own session files. The graph is the richer store, but it needs a running
 * server — and an empty panel is useless on a machine that has none, when the
 * transcripts on disk already say which files it edits, which commands it
 * runs, and how its runs end.
 */
import type { SessionSummary } from "./scan.js";
import { loadSessionDetail } from "./detail.js";
import { scanSessions, sessionsRoot } from "./scan.js";
import { join } from "node:path";

export interface Tally {
	name: string;
	count: number;
}

export interface LocalKnowledge {
	repo: string;
	runs: { total: number; completed: number; failed: number; costUsd: number; lastAt?: string };
	files: Tally[];
	commands: Tally[];
	failures: { task: string; detail: string; at: string }[];
}

const TOP = 8;
const MAX_SESSIONS = 40;

function top(counts: Map<string, number>): Tally[] {
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		.slice(0, TOP);
}

const arg = (args: unknown, key: string): string => {
	const v = (args as Record<string, unknown> | null)?.[key];
	return typeof v === "string" ? v : "";
};

export function buildLocalKnowledge(repoRoot: string, summaries?: SessionSummary[]): LocalKnowledge {
	const mine = (summaries ?? scanSessions()).filter((s) => s.repoRoot === repoRoot);
	const knowledge: LocalKnowledge = {
		repo: repoRoot,
		runs: {
			total: mine.length,
			completed: mine.filter((s) => s.status === "completed").length,
			failed: mine.filter((s) => s.status === "error" || s.status === "stopped").length,
			costUsd: mine.reduce((n, s) => n + s.costUsd, 0),
			...(mine[0] !== undefined ? { lastAt: mine[0].createdAt } : {}),
		},
		files: [],
		commands: [],
		failures: [],
	};

	const files = new Map<string, number>();
	const commands = new Map<string, number>();
	for (const s of mine.slice(0, MAX_SESSIONS)) {
		let detail: ReturnType<typeof loadSessionDetail>;
		try {
			detail = loadSessionDetail(join(sessionsRoot(), s.key));
		} catch {
			continue; // a truncated session should not blank the panel
		}
		for (const item of detail.items) {
			if (item.kind !== "assistant") continue;
			for (const t of item.tools) {
				if (t.name === "write" || t.name === "edit") {
					const p = arg(t.args, "file_path");
					if (p !== "") files.set(p, (files.get(p) ?? 0) + 1);
				} else if (t.name === "bash") {
					// First two words: `npm test`, `git status` — the shape that repeats.
					const c = arg(t.args, "command").trim().split(/\s+/).slice(0, 2).join(" ");
					if (c !== "") commands.set(c, (commands.get(c) ?? 0) + 1);
				}
				if (t.isError && knowledge.failures.length < 5) {
					knowledge.failures.push({
						task: s.task,
						detail: (t.output ?? "").split("\n")[0]?.slice(0, 140) ?? "",
						at: s.createdAt,
					});
				}
			}
		}
	}
	knowledge.files = top(files);
	knowledge.commands = top(commands);
	return knowledge;
}
