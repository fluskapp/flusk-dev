/**
 * How much of its OWN flow a step may re-read, and what it costs.
 *
 * The naive move is to hand every step the whole transcript, which fails twice:
 * the tenth step's prompt becomes mostly the first step's thinking, and the
 * budget that should be buying retrieved precedent is spent re-reading this
 * same run. A step sees the latest artifact of each kind it reads, trimmed to a
 * share of a fixed cap — failed steps included, because a retry needs the
 * failure most of all.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { saveIndex } from "../src/history/index-store.js";
import type { CardKind, HistoryCard } from "../src/history/types.js";
import { nodeContext } from "../src/lang/context.js";
import { nodePrompt } from "../src/lang/prompt-provider.js";
import type { FlowNode, FlowSpec, FlowState, FlowStep } from "../src/lang/types.js";

/** Everything a user of the flow runtime writes. Nothing here is a prompt. */
const SPEC: FlowSpec = {
	name: "retry hook",
	description: "add backoff to the queue worker",
	entry: "plan-1",
	nodes: [
		{ id: "plan-1", kind: "plan", about: "retry hook shape", next: ["code-1"] },
		{ id: "code-1", kind: "code", about: "the queue worker", next: ["verify-1"] },
		{ id: "verify-1", kind: "verify" },
	],
};
const node = (id: string): FlowNode => SPEC.nodes.find((n) => n.id === id) as FlowNode;
const TASK = "add a retry hook with backoff to the queue worker";
const PLAN = "Add a backoff helper beside the worker. Cap the ceiling at thirty seconds.";

const long = (w: string, n = 64): string =>
	Array.from({ length: n }, (_, i) => `The ${w} retry worker handles case ${i}.`).join(" ");

function card(id: string, kind: CardKind, over: Partial<HistoryCard> = {}): HistoryCard {
	return {
		id,
		kind,
		project: "linof-base",
		at: "2026-08-01T00:00:00.000Z",
		outcome: "shipped",
		ref: id,
		title: TASK,
		text: long("queue", 160),
		paths: ["src/queue/worker.ts"],
		...over,
	};
}

/** Precedent big enough that a budget must choose, plus a rule and a failure. */
const CORPUS = [
	card("commit:linof-base:aaaa1111", "commit", { ref: "aaaa1111bbbb2222" }),
	card("journal:linof-base:run-9", "journal", {
		title: "retry hook rollout",
		outcome: "failed",
		ref: "/tmp/docs/runs/run-9.md",
	}),
	card("doc:linof-base:CONTRIBUTING.md", "doc", {
		title: "Contributing",
		outcome: "unknown",
		ref: "/tmp/CONTRIBUTING.md",
		paths: ["CONTRIBUTING.md"],
		text: "Tabs. Relative imports end in .js. Retry logic lives in the worker.",
	}),
];

/** A finished step, as the runtime records one: id, kind, output, did it pass. */
type Done = [string, FlowStep["kind"], string, boolean?];

function state(...rows: Done[]): FlowState {
	const steps: FlowStep[] = rows.map(([nodeId, kind, output, ok = true]) => ({
		nodeId,
		kind,
		startedAt: "2026-08-01T00:00:00.000Z",
		ok,
		output,
		promptTokens: 0,
	}));
	const artifacts: Record<string, string> = {};
	for (const s of steps) artifacts[s.nodeId] = s.output;
	return { task: TASK, project: "linof-base", artifacts, costUsd: 0, steps };
}
const planned = state(["plan-1", "plan", PLAN]);

let home: string;
beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "ah-lang-prompt-"));
	process.env.AH_HOME = home;
	saveIndex({ cards: CORPUS, builtAt: new Date().toISOString(), stamps: {} });
});
afterAll(() => {
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("budgets by kind, and caps what a long flow may re-read", () => {
	const plan = nodePrompt(node("plan-1"), planned);
	const tight = nodePrompt(node("plan-1"), planned, { budgets: { plan: 200 } });
	expect(plan.tokens).toBeGreaterThan(nodePrompt(node("verify-1"), planned).tokens);
	expect(tight.tokens).toBeLessThan(plan.tokens);

	const flow = state(
		["plan-1", "plan", PLAN],
		["code-1", "code", long("change")],
		["verify-1", "verify", "Gate failed: 2 assertions.", false],
		["review-1", "review", "The ceiling is unbounded."],
	);
	const carried = nodeContext({ id: "code-2", kind: "code" }, flow);
	// The latest of each kind it reads — not the transcript, not the long diff.
	expect(carried.map((c) => c.source)).toEqual(["node plan-1 (plan)", "node review-1 (review)"]);
	expect(carried.reduce((n, c) => n + c.tokens, 0)).toBeLessThanOrEqual(700);
	// A failed step is still evidence — that is what a retry has to read.
	const sum = nodeContext({ id: "sum-1", kind: "summarize" }, flow);
	expect(sum.find((c) => c.source.endsWith("(verify)"))?.why).toContain("It did not pass.");
});
