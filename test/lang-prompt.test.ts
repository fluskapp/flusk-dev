/**
 * "No prompt needed", made machine-checkable: the SPEC below is everything a
 * user writes, and the last test fails if any field of it ever grew into a
 * prompt. Offline — a seeded index in a temp FLUSK_HOME, per cli-history.test.ts.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { saveIndex } from "../src/features/history/index-store.repository.js";
import type { CardKind, HistoryCard } from "../src/features/history/types.js";
import { isPhrase } from "../src/features/flows/context.js";
import { nodePrompt } from "../src/features/flows/prompt-provider.js";
import type { FlowNode, FlowSpec, FlowState, FlowStep } from "../src/features/flows/types.js";

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
	home = mkdtempSync(join(tmpdir(), "flusk-lang-prompt-"));
	process.env.FLUSK_HOME = home;
	saveIndex({ cards: CORPUS, builtAt: new Date().toISOString(), stamps: {} });
});
afterAll(() => {
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("gives a code step its plan and cited precedent, out of one phrase", () => {
	const p = nodePrompt(node("code-1"), planned);
	// The one generated instruction, and the only one in the prompt.
	expect(p.text.split("\n")[0]).toBe(
		"Make the code change for the queue worker using the evidence below.",
	);
	// Each block carries the one line that justifies its tokens, then the body —
	// the same renderer `flusk prompt` uses (src/history/render-blocks.ts).
	expect(p.text).toContain(
		`## task\nThe work to do; every other block is here to serve it.\n${TASK}`,
	);
	expect(p.text).toContain("## node plan-1 (plan)\nThe plan this step implements.");
	expect(p.text).toContain(PLAN); // inherited: nobody wired plan → code
	expect(p.text).toContain("## commit aaaa1111"); // precedent, openable
	// The failed journal, spent as a DON'T that keeps its citation.
	expect(p.text).toMatch(/## Constraints\n- Do not retry "retry hook rollout"/);
	// Every section names its origin, and every origin is in the text.
	expect(p.sources.slice(0, 3)).toEqual(["job", "task", "node plan-1 (plan)"]);
	expect(p.sources).toContain("doc linof-base/CONTRIBUTING.md");
	for (const source of p.sources.slice(1)) expect(p.text).toContain(`## ${source}`);
	expect(p.tokens).toBeGreaterThan(100);

	// An unindexed machine is still a prompt: job, task, and what the flow knows.
	const bare = nodePrompt(node("code-1"), planned, { cards: [] });
	expect(bare.sources).toEqual(["job", "task", "node plan-1 (plan)"]);
	expect(bare.text).toContain(PLAN);
});

it("fails if any field of the spec ever grows into a prompt", () => {
	const strings = (v: unknown): string[] =>
		typeof v === "string"
			? [v]
			: typeof v === "object" && v !== null
				? Object.values(v).flatMap(strings)
				: [];
	const fields = [...strings(SPEC), TASK];
	expect(fields.length).toBeGreaterThan(8);
	for (const field of fields) expect(isPhrase(field)).toBe(true);
});
