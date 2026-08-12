/**
 * Sources the assembler tests can control, because the real six cannot be
 * made to flood, fail or collide on demand.
 *
 * These are contract-shaped fakes, not mocks: `gather` is total, ids are
 * stable and derived, scores sit on the same per-source scales the real
 * sources declare. A fake that broke the contract would only prove the
 * assembler tolerates a broken source.
 */

import type {
	ContextItem,
	ContextRequest,
	ContextSource,
	ContextTier,
	SourceResult,
	SourceStatus,
} from "../src/features/context/types.js";
import { estimateTokens } from "../src/features/history/budget.js";

export interface ItemSpec {
	id: string;
	source: string;
	title?: string;
	body: string;
	why?: string;
	score?: number;
	tier?: ContextTier;
	path?: string;
}

export function makeItem(spec: ItemSpec): ContextItem {
	const title = spec.title ?? spec.id;
	const why = spec.why ?? `Gathered from ${spec.source} because the test asked for ${spec.id}.`;
	return {
		id: spec.id,
		source: spec.source,
		title,
		body: spec.body,
		why,
		tokens: estimateTokens(`${title}\n${why}\n${spec.body}`),
		score: spec.score ?? 0,
		tier: spec.tier ?? "ranked",
		...(spec.path === undefined ? {} : { path: spec.path }),
	};
}

export interface FakeSpec {
	id: string;
	label?: string;
	items?: ItemSpec[];
	status?: SourceStatus;
	notes?: string[];
	/** Items differing between builds would break the determinism assertions. */
	onGather?: (req: ContextRequest) => void;
}

export function fakeSource(spec: FakeSpec): ContextSource {
	const items = (spec.items ?? []).map(makeItem);
	const status: SourceStatus = spec.status ?? (items.length === 0 ? "skipped" : "ok");
	return {
		id: spec.id,
		label: spec.label ?? spec.id,
		gather: (req): SourceResult => {
			spec.onGather?.(req);
			return {
				items,
				status,
				notes: spec.notes ?? (status === "ok" ? [] : [`${spec.id}: nothing to report`]),
			};
		},
	};
}

/** A body long enough to be worth packing, deterministic in its content. */
export const paragraph = (seed: string, sentences: number): string =>
	Array.from(
		{ length: sentences },
		(_, i) => `${seed} sentence ${i} about the verify chain and the files it guards.`,
	).join(" ");

export const request = (over: Partial<ContextRequest> & { repoRoot: string }): ContextRequest => ({
	task: "make the gate pass",
	budgetTokens: 2000,
	isResume: false,
	...over,
});

/** A source with more to say than any budget can hold, all of it distinct. */
export const flood = (n: number, seed = "commit"): ContextSource =>
	fakeSource({
		id: "history",
		label: "History",
		items: Array.from({ length: n }, (_, i) => ({
			id: `history:commit:${String(i).padStart(3, "0")}`,
			source: "history",
			title: `commit ${seed}${i}`,
			body: paragraph(`${seed} ${i} touching src/module${i}.ts`, 6),
			score: 0.9 - i / 1000,
		})),
	});

/** The small source the floors exist for: it can never win on rank. */
export const tinyProfile = fakeSource({
	id: "profile",
	label: "Repo profile",
	items: [
		{
			id: "profile:stack",
			source: "profile",
			title: "Stack",
			body: "node (runtime) — package.json: engines >=22. typescript (language) — tsconfig.json.",
			score: 0.4,
		},
	],
});

/** One pinned house rule, the shape the real house-rules source emits. */
export const pinnedRules = fakeSource({
	id: "house-rules",
	label: "House rules",
	items: [
		{
			id: "house-rules:AGENTS.md",
			source: "house-rules",
			title: "House rules (AGENTS.md)",
			body: "Run the gate before reporting done.",
			why: "House rule for this repo, from AGENTS.md — it governs how the rest of this block is read.",
			tier: "pinned",
			path: "AGENTS.md",
		},
	],
});

/** One ranked history card, scored on history's declared 0..1 scale. */
export const oneCommit = fakeSource({
	id: "history",
	label: "History",
	items: [
		{
			id: "history:commit:abc",
			source: "history",
			title: "commit abc1234",
			body: paragraph("A previous attempt", 4),
			score: 0.85,
		},
	],
});
