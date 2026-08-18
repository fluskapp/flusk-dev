/**
 * The dashboard's front page: everything flusk can see at a glance — its own
 * sessions, the harness journals it follows, and the markdown it indexes.
 */
import { ageStatus, isLive } from "../run/liveness.js";
import { statusToVerdict, type Verdict } from "../run/verdict.types.js";
import type { Journal } from "./journal-scan.repository.js";
import type { SessionSummary } from "./scan.repository.js";

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
	/** Session key or journal path — the handle for opening the run. */
	ref: string;
	verdict?: Verdict;
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
	/** True per-root journal counts (journal-lookup's countJournals): the
	 * displayed counts must not repeat the feed cap's lie. Absent, the capped
	 * list is all there is to count. */
	journalCounts?: ReadonlyMap<string, number>,
	now: Date = new Date(),
): Overview {
	const trueRuns = new Map<string, number>();
	for (const [root, n] of journalCounts ?? [])
		trueRuns.set(base(root), (trueRuns.get(base(root)) ?? 0) + n);
	const runCount =
		journalCounts === undefined
			? journals.length
			: [...trueRuns.values()].reduce((a, b) => a + b, 0);
	// Live is verified against the last WRITE, not read off a status a dead
	// orchestrator never closed (features/run/liveness.ts) — the tile, the tree
	// badge and the Runs Live section count the same population.
	const nowMs = now.getTime();
	const live = journals.filter((j) => isLive(j.status, j.mtimeMs, nowMs));
	const running = sessions.filter((s) => isLive(s.status, s.updatedAtMs, nowMs));
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
			runs: trueRuns.get(j.harness) ?? e.runs + 1,
			live: e.live + (isLive(j.status, j.mtimeMs, nowMs) ? 1 : 0),
		});
	}

	const activity: ActivityItem[] = [
		...sessions.slice(0, 12).map((s) => {
			const status = ageStatus(s.status, s.updatedAtMs, nowMs);
			return {
				kind: "session" as const,
				title: s.task,
				status,
				at: s.createdAt,
				where: base(s.repoRoot),
				ref: s.key,
				// The native Rust scanner's rows predate verdict; fall back to status.
				verdict:
					status === s.status ? (s.verdict ?? statusToVerdict(status)) : statusToVerdict(status),
			};
		}),
		...journals.slice(0, 12).map((j) => {
			const status = ageStatus(j.status, j.mtimeMs, nowMs);
			return {
				kind: "run" as const,
				title: j.title.replace(/^Run:\s*/, ""),
				status,
				at: j.date,
				where: j.harness,
				ref: j.path,
				verdict: statusToVerdict(status),
			};
		}),
	]
		.sort((a, b) => b.at.localeCompare(a.at))
		.slice(0, 14);

	return {
		stats: [
			{ label: "sessions", value: String(sessions.length), hint: `${today.length} today` },
			{ label: "running", value: String(running.length + live.length), hint: "sessions + runs" },
			{ label: "harness runs", value: String(runCount), hint: `${live.length} live` },
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
