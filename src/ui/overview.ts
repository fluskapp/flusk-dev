/**
 * The dashboard's front page: everything flusk can see at a glance — its own
 * sessions, the harness journals it follows, and the markdown it indexes.
 */
import type { Journal } from "./journal-scan.js";
import type { SessionSummary } from "./scan.js";

export interface Stat {
	label: string;
	value: string;
	hint?: string;
}

export interface ActivityItem {
	kind: "session" | "run";
	title: string;
	status: string;
	at: string;
	where: string;
}

export interface Overview {
	stats: Stat[];
	activity: ActivityItem[];
	repos: { name: string; sessions: number; costUsd: number }[];
	harnesses: { name: string; runs: number; live: number }[];
}

const money = (n: number): string => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const base = (p: string): string => p.split("/").filter(Boolean).pop() ?? p;

function isToday(iso: string, now: Date): boolean {
	return iso.slice(0, 10) === now.toISOString().slice(0, 10);
}

export function buildOverview(
	sessions: SessionSummary[],
	journals: Journal[],
	artifactCount: number,
	now: Date = new Date(),
): Overview {
	const live = journals.filter((j) => j.status === "running");
	const running = sessions.filter((s) => s.status === "running");
	const cost = sessions.reduce((n, s) => n + s.costUsd, 0);
	const today = sessions.filter((s) => isToday(s.createdAt, now));

	const byRepo = new Map<string, { sessions: number; costUsd: number }>();
	for (const s of sessions) {
		const e = byRepo.get(s.repoRoot) ?? { sessions: 0, costUsd: 0 };
		byRepo.set(s.repoRoot, { sessions: e.sessions + 1, costUsd: e.costUsd + s.costUsd });
	}
	const byHarness = new Map<string, { runs: number; live: number }>();
	for (const j of journals) {
		const e = byHarness.get(j.harness) ?? { runs: 0, live: 0 };
		byHarness.set(j.harness, {
			runs: e.runs + 1,
			live: e.live + (j.status === "running" ? 1 : 0),
		});
	}

	const activity: ActivityItem[] = [
		...sessions.slice(0, 12).map((s) => ({
			kind: "session" as const,
			title: s.task,
			status: s.status,
			at: s.createdAt,
			where: base(s.repoRoot),
		})),
		...journals.slice(0, 12).map((j) => ({
			kind: "run" as const,
			title: j.title.replace(/^Run:\s*/, ""),
			status: j.status,
			at: j.date,
			where: j.harness,
		})),
	]
		.sort((a, b) => b.at.localeCompare(a.at))
		.slice(0, 14);

	return {
		stats: [
			{ label: "sessions", value: String(sessions.length), hint: `${today.length} today` },
			{ label: "running", value: String(running.length + live.length), hint: "sessions + runs" },
			{ label: "harness runs", value: String(journals.length), hint: `${live.length} live` },
			{ label: "documents", value: String(artifactCount), hint: "indexed markdown" },
			{ label: "spend", value: money(cost), hint: "all recorded sessions" },
			{ label: "repos", value: String(byRepo.size), hint: "with sessions" },
		],
		activity,
		repos: [...byRepo.entries()]
			.map(([name, v]) => ({ name: base(name), ...v }))
			.sort((a, b) => b.sessions - a.sessions),
		harnesses: [...byHarness.entries()]
			.map(([name, v]) => ({ name, ...v }))
			.sort((a, b) => b.runs - a.runs),
	};
}
