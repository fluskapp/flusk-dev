/**
 * Choosing WHICH agent gets a task.
 *
 * The rule that matters is the last one: when nothing fits, this says so and
 * routes nowhere. Falling back to "whatever is left" is how a task meant for
 * a reviewer ends up rewriting a repo on a model the user never picked, so an
 * unroutable task is a result the caller must handle, never a silent guess.
 *
 * Availability is asked, not assumed. An agent whose CLI is not installed or
 * whose backendId does not resolve is still scored and still returned — with
 * the reason it cannot run — but it is never selected. Every candidate comes
 * back for exactly that reason: a routing decision you cannot inspect is a
 * routing decision you cannot fix.
 *
 * Selection requires a non-zero DESCRIPTION score. Kind agreement and
 * benchmarks only order the agents that already claim the job.
 */
import type { AhConfig, TaskKind } from "../config/types.js";
import { classifyTask } from "../provider/intent.js";
import type { Scores } from "../provider/scores.js";
import { type Fit, fitFor, taskTermsOf } from "./route-match.js";
import type { AgentRegistry, AgentSpec, AgentWorkerKind, Worker } from "./types.js";

export interface RouteCandidate {
	spec: AgentSpec;
	available: boolean;
	/** Why it cannot run, when it cannot: missing binary, unresolved backend. */
	reason?: string;
	fit: Fit;
}

export type RouteResult =
	| { ok: true; kind: TaskKind; spec: AgentSpec; why: string; candidates: RouteCandidate[] }
	| { ok: false; kind: TaskKind; reason: string; candidates: RouteCandidate[] };

export interface RouteOpts {
	task: string;
	registry: AgentRegistry;
	/** undefined for a worker kind this host does not wire up. */
	workerFor: (kind: AgentWorkerKind) => Worker | undefined;
	config: AhConfig;
	/** From loadScores(); absent means no benchmarks are recorded yet. */
	scores?: Scores;
}

export async function routeTask(opts: RouteOpts): Promise<RouteResult> {
	const kind = classifyTask(opts.task);
	const terms = taskTermsOf(opts.task);
	const specs = opts.registry.list();
	const candidates = await Promise.all(specs.map((spec) => rate(opts, spec, kind, terms)));
	// Deterministic: same disk, same task, same order — name breaks every tie.
	candidates.sort((a, b) => b.fit.total - a.fit.total || a.spec.name.localeCompare(b.spec.name));

	const best = candidates.find((c) => c.available && c.fit.description > 0);
	if (best === undefined) return { ok: false, kind, reason: explain(kind, candidates), candidates };
	return {
		ok: true,
		kind,
		spec: best.spec,
		why:
			`${best.spec.name} (${best.spec.scope}/${best.spec.worker}) fits this ${kind} task: ` +
			`description ${best.fit.description.toFixed(2)}, benchmark ${best.fit.bench.toFixed(2)}`,
		candidates,
	};
}

async function rate(
	opts: RouteOpts,
	spec: AgentSpec,
	kind: TaskKind,
	terms: ReadonlySet<string>,
): Promise<RouteCandidate> {
	const fit = fitFor(terms, spec, kind, opts.config, opts.scores);
	const worker = opts.workerFor(spec.worker);
	if (worker === undefined) {
		return { spec, available: false, reason: `no worker for kind "${spec.worker}"`, fit };
	}
	// available() is contractually total, but a foreign Worker is still foreign:
	// one throw here would lose every other candidate with it.
	try {
		const probe = await worker.available(spec);
		if (probe.ok) return { spec, available: true, fit };
		return { spec, available: false, reason: probe.reason ?? "unavailable", fit };
	} catch (e) {
		return { spec, available: false, reason: e instanceof Error ? e.message : String(e), fit };
	}
}

/** Says which of the three "no" cases happened, and names the agents involved. */
function explain(kind: TaskKind, candidates: RouteCandidate[]): string {
	if (candidates.length === 0) return "no agents are registered";
	const usable = candidates.filter((c) => c.available);
	if (usable.length === 0) {
		const why = candidates.map((c) => `${c.spec.name} (${c.reason ?? "unavailable"})`).join(", ");
		return `no agent is available for this ${kind} task: ${why}`;
	}
	const names = usable.map((c) => c.spec.name).join(", ");
	return `no available agent's description matches this ${kind} task: ${names}`;
}
