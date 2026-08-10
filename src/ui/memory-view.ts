/**
 * What ah knows, assembled for the dashboard: the goal graphs it is working,
 * the lessons it has learned, and the unattended attempt ledger.
 *
 * This is the "what happened overnight" view. Memory is optional, so an
 * unreachable abagraph is a normal answer (`connected: false`), never an error.
 */
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { createMemoryClient } from "../memory/client.js";
import type { MemFact, MemoryClient } from "../memory/client-types.js";
import { AH_NS, LESSONS_NS, resolveNamespace } from "../memory/namespaces.js";

export interface TaskView {
	id: string;
	description: string;
	status: string;
	dependsOn: string[];
}

export interface GoalView {
	id: string;
	title: string;
	status: string;
	tasks: TaskView[];
}

export interface LedgerItem {
	key: string;
	outcome?: string;
	attemptedAt?: string;
	cooldownUntil?: string;
}

export interface MemoryView {
	connected: boolean;
	namespace: string;
	goals: GoalView[];
	lessons: MemFact[];
	ledger: LedgerItem[];
	note?: string;
}

const bare = (subject: string): string => subject.slice(subject.indexOf(":") + 1);

/** Index facts by subject → predicate → objects, for cheap graph assembly. */
function index(facts: MemFact[]): Map<string, Map<string, string[]>> {
	const out = new Map<string, Map<string, string[]>>();
	for (const f of facts) {
		let byPred = out.get(f.subject);
		if (byPred === undefined) {
			byPred = new Map();
			out.set(f.subject, byPred);
		}
		byPred.set(f.predicate, [...(byPred.get(f.predicate) ?? []), f.object]);
	}
	return out;
}

const one = (m: Map<string, string[]> | undefined, p: string): string | undefined =>
	m?.get(p)?.[0];

function buildGoals(facts: MemFact[]): GoalView[] {
	const idx = index(facts);
	const goals: GoalView[] = [];
	for (const [subject, preds] of idx) {
		if (!subject.startsWith("Goal:")) continue;
		const tasks: TaskView[] = (preds.get("has_task") ?? []).map((ref) => {
			const t = idx.get(ref);
			return {
				id: bare(ref),
				description: one(t, "description") ?? "",
				status: one(t, "status") ?? "pending",
				dependsOn: (t?.get("depends_on") ?? []).map(bare),
			};
		});
		goals.push({
			id: bare(subject),
			title: one(preds, "title") ?? "(untitled)",
			status: one(preds, "status") ?? "planned",
			tasks,
		});
	}
	return goals;
}

function buildLedger(facts: MemFact[]): LedgerItem[] {
	const idx = index(facts);
	const items: LedgerItem[] = [];
	for (const [subject, preds] of idx) {
		if (!subject.startsWith("Item:")) continue;
		items.push({
			key: bare(subject),
			...(one(preds, "outcome") !== undefined ? { outcome: one(preds, "outcome") } : {}),
			...(one(preds, "attempted_at") !== undefined
				? { attemptedAt: one(preds, "attempted_at") }
				: {}),
			...(one(preds, "cooldown_until") !== undefined
				? { cooldownUntil: one(preds, "cooldown_until") }
				: {}),
		});
	}
	return items.sort((a, b) => (b.attemptedAt ?? "").localeCompare(a.attemptedAt ?? ""));
}

async function collect(client: MemoryClient, ns: string): Promise<MemFact[]> {
	// Candidates too: extracted lessons live below abagraph's 0.75 threshold
	// and would otherwise be invisible here.
	const rows: MemFact[] = [];
	for (const status of ["active", "candidate"]) {
		rows.push(...(await client.query(ns, { status, limit: 500 })));
	}
	return rows;
}

export async function buildMemoryView(repoRoot: string): Promise<MemoryView> {
	const cfg = loadConfig(repoRoot);
	const ns = resolveNamespace(repoRoot, loadRepoConfig(repoRoot));
	const empty: MemoryView = { connected: false, namespace: ns, goals: [], lessons: [], ledger: [] };
	if (!cfg.memory.enabled) return { ...empty, note: "memory disabled in config" };
	const client = createMemoryClient({ baseUrl: cfg.memory.baseUrl, apiKey: cfg.memory.apiKey });
	if (!(await client.health())) {
		return { ...empty, note: `abagraph unreachable at ${cfg.memory.baseUrl}` };
	}
	try {
		return {
			connected: true,
			namespace: ns,
			goals: buildGoals(await collect(client, ns)),
			lessons: await collect(client, LESSONS_NS),
			ledger: buildLedger(await collect(client, AH_NS)),
		};
	} catch (e) {
		return { ...empty, note: e instanceof Error ? e.message : String(e) };
	}
}
