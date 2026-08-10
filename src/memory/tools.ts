/**
 * The three memory tools. Namespaces are bound at construction — the model
 * never chooses one. Transport failures throw; the dispatcher renders them
 * as isError results (the model sees memory unavailable).
 */
import { Type } from "typebox";
import type { Tool } from "../tools/tool.js";
import { whatsChanged } from "./changes.js";
import type { MemFact, MemoryClient } from "./client-types.js";
import { factLine } from "./contextpack.js";
import { isPortableSubject, isVocabularyPredicate, vocabularyFact, vocabularyRows } from "./facts.js";
import { LESSONS_NS } from "./namespaces.js";

export interface MemoryToolsOpts {
	repoNs: string;
	/** Current run id (bound late: the port learns it at the first preTurn). */
	runId: () => string;
}

const RECALL_CAP = 15;
/** Rows requested before hit's client-side namespace filter runs. */
const FETCH_CAP = 500;
const MAX_AGENT_CONFIDENCE = 0.7;

const recallParams = Type.Object({
	query: Type.String(),
	mode: Type.Union([Type.Literal("semantic"), Type.Literal("pattern")]),
	subject: Type.Optional(Type.String()),
	predicate: Type.Optional(Type.String()),
});

const rememberParams = Type.Object({
	subject: Type.String(),
	predicate: Type.String(),
	object: Type.String(),
	confidence: Type.Optional(Type.Number()),
	why: Type.Optional(Type.String()),
});

const changesParams = Type.Object({ since: Type.String() });

export function memoryTools(client: MemoryClient, opts: MemoryToolsOpts): Tool[] {
	const recall: Tool<typeof recallParams> = {
		name: "memory_recall",
		description:
			"Recall facts from long-term memory (this repo first, then cross-repo lessons). " +
			'mode "semantic" searches by meaning of `query`; mode "pattern" filters by exact ' +
			"`subject` and/or `predicate`.",
		parameters: recallParams,
		mode: "parallel",
		async execute(args) {
			const pattern = (ns: string): Promise<MemFact[]> =>
				client.query(ns, {
					subject: args.subject,
					predicate: args.predicate,
					// Candidates included: everything the agent remembers is capped
					// at 0.7, which abagraph parks below its 0.75 threshold and
					// hides from default reads — recall would never see it.
					status: "active,candidate",
					// Fetch generously: the server caps rows BEFORE hit filters by
					// namespace, so a small limit can return none of ours.
					limit: FETCH_CAP,
				});
			const fetch = async (ns: string): Promise<MemFact[]> => {
				if (args.mode !== "semantic") return pattern(ns);
				const hits = await client.search(ns, args.query, RECALL_CAP);
				// Semantic search needs an embedding provider; without one the
				// server answers empty. Fall back rather than claim amnesia.
				return hits.length > 0 ? hits : pattern(ns);
			};
			const [repo, lessons] = await Promise.all([fetch(opts.repoNs), fetch(LESSONS_NS)]);
			const facts = [...repo, ...lessons].slice(0, RECALL_CAP);
			if (facts.length === 0) return { output: "No matching memory." };
			return { output: facts.map(factLine).join("\n"), details: { count: facts.length } };
		},
	};

	const remember: Tool<typeof rememberParams> = {
		name: "memory_remember",
		description:
			"Store one durable fact about this repo. Predicates come from a fixed vocabulary; " +
			"confidence is capped at 0.7 (agent-asserted). Optionally say why.",
		parameters: rememberParams,
		mode: "sequential",
		async execute(args) {
			const prefix = args.subject.split(":", 1)[0] ?? "";
			if (!isVocabularyPredicate(prefix, args.predicate)) {
				const rows = vocabularyRows();
				const forPrefix = rows.filter((r) => r.startsWith(`${prefix} `));
				throw new Error(
					`unknown predicate "${args.predicate}" for subject type "${prefix}". ` +
						`Allowed: ${(forPrefix.length > 0 ? forPrefix : rows).join(", ")}`,
				);
			}
			const confidence = Math.min(args.confidence ?? MAX_AGENT_CONFIDENCE, MAX_AGENT_CONFIDENCE);
			const input = {
				...vocabularyFact(args.subject, args.predicate, args.object, confidence),
				source: `agent:run:${opts.runId()}`,
				...(args.why !== undefined ? { properties: { why: args.why } } : {}),
			};
			// Cross-repo subjects belong in the lessons namespace, as digestion
			// already writes them. Splitting one functional predicate across two
			// namespaces is worse than a leak: with tenants dropped by an
			// auth-free server the conflict set is shared, so the two copies
			// silently supersede each other.
			const ns = isPortableSubject(args.subject) ? LESSONS_NS : opts.repoNs;
			await client.transact(ns, [input]);
			return {
				output: `Remembered: ${args.subject} ${args.predicate} ${args.object} (conf ${confidence})`,
			};
		},
	};

	const changes: Tool<typeof changesParams> = {
		name: "memory_changes",
		description:
			"What changed in this repo's memory since an ISO timestamp: newly added facts " +
			"and facts superseded by newer knowledge.",
		parameters: changesParams,
		mode: "parallel",
		async execute(args) {
			const { added, superseded } = await whatsChanged(client, opts.repoNs, args.since);
			if (added.length === 0 && superseded.length === 0) {
				return { output: `No memory changes since ${args.since}.` };
			}
			const section = (label: string, facts: MemFact[]) =>
				facts.length === 0 ? [] : [`${label}:`, ...facts.map((f) => `  ${factLine(f)}`)];
			return {
				output: [...section("Added", added), ...section("Superseded", superseded)].join("\n"),
				details: { added: added.length, superseded: superseded.length },
			};
		},
	};

	return [recall, remember, changes];
}
