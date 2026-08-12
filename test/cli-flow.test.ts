/**
 * `flusk flow`, offline.
 *
 * The load-bearing assertion is the one about --dry: it is handed a chat model
 * factory that THROWS if anything asks for a model, so a passing test proves
 * the plan and every node prompt were composed without a model call — which is
 * the whole "no prompt needed" claim, checked rather than asserted in prose.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { parseFlowArgs } from "../src/cli/flow-args.js";
import { type FlowCmdOpts, flowCmd } from "../src/cli/flow-cmd.js";
import { saveIndex } from "../src/history/index-store.js";
import type { HistoryCard } from "../src/history/types.js";
import { langMissing } from "../src/lang/deps.js";
import { capture } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome, writeHomeConfig } from "./helpers.js";

let repo: string;

const CARD: HistoryCard = {
	id: "commit:repo:aaaa1111",
	kind: "commit",
	project: "repo",
	ref: "aaaa1111",
	title: "retry the upload with backoff",
	text: "The uploader retries with backoff. Cap the ceiling at thirty seconds.",
	at: "2026-08-01T00:00:00.000Z",
	paths: ["src/upload/worker.ts"],
	outcome: "shipped",
};

/** A model factory that fails the test if the runtime ever reaches for a model. */
const noModel: FlowCmdOpts["chat"] = async () => {
	throw new Error("a model was called");
};

async function run(over: Partial<FlowCmdOpts>): Promise<{ code: string; text: string }> {
	const { out, text } = capture();
	const outcome = await flowCmd({ sub: "list", repo, out, chat: noModel, ...over });
	return { code: outcome, text: text() };
}

beforeEach(async () => {
	repo = await setupTestHome("flusk-cli-flow-");
	await writeHomeConfig({ memory: { enabled: false } });
	saveIndex({ cards: [CARD], builtAt: new Date().toISOString(), stamps: {} });
});

afterEach(() => {
	teardownTestHome();
});

it("lists the built-in flows, nesting and all", async () => {
	const { code, text } = await run({ sub: "list" });
	expect(code).toBe("completed");
	expect(text).toContain("built-in flows");
	expect(text).toContain("fix      plan -> code -> verify");
	expect(text).toContain("explore  plan -> say");
	// ship CONTAINS fix: composition is visible in the shape, not just the docs.
	expect(text).toContain("ship     fix[plan -> code -> verify] -> review -> verify");
	expect(text).toContain("(none)");
});

it("lists a user flow from .flusk/flows and names a broken one", async () => {
	await mkdir(join(repo, ".flusk", "flows"), { recursive: true });
	const tidy =
		'{"name":"tidy","description":"look, then say","entry":"look","nodes":[' +
		'{"id":"look","kind":"review","about":"what is messy","next":["say"]},' +
		'{"id":"say","kind":"summarize","about":"what to clean"}]}';
	await writeFile(join(repo, ".flusk", "flows", "tidy.json"), tidy);
	await writeFile(join(repo, ".flusk", "flows", "broken.json"), JSON.stringify({ nodes: [] }));
	const { text } = await run({ sub: "list" });
	expect(text).toContain("tidy  look -> say");
	expect(text).toContain("skipped:");
	expect(text).toContain("name must be a non-empty string");
});

it("--dry prints the graph and every node's composed prompt, calling no model", async () => {
	const { code, text } = await run({
		sub: "run",
		arg: "add a retry with backoff to the uploader",
		dry: true,
		project: "repo",
	});
	expect(code).toBe("completed");
	expect(text).toContain("graph: plan -> code -> verify");
	// The one generated instruction line per node — nobody wrote these.
	expect(text).toContain("job: Plan the approach for the change this task needs");
	expect(text).toContain("job: Make the code change for make the change");
	// …and where the rest of each prompt came from.
	expect(text).toMatch(/sources: job, task/);
	expect(text).toContain("retry the upload with backoff");
});

it("--dry follows --flow, expands a nested flow, and speaks JSON", async () => {
	const { text } = await run({ sub: "run", arg: "ship it", flow: "ship", dry: true, json: true });
	const plan = JSON.parse(text) as {
		flow: string;
		shape: string;
		nodes: { id: string; kind: string; sources: string[] }[];
	};
	expect(plan.flow).toBe("ship");
	expect(plan.shape).toBe("fix[plan -> code -> verify] -> review -> verify");
	// The nested flow's steps are the ones that will run a model, so they are
	// the ones with prompts — and they are labelled by where they sit.
	const ids = ["fix/plan", "fix/code", "fix/verify", "review", "verify"];
	expect(plan.nodes.map((n) => n.id)).toEqual(ids);
	expect(plan.nodes.every((n) => n.sources[0] === "job")).toBe(true);
});

it("exits non-zero on an unknown flow, an unknown subcommand and a missing checkpoint", async () => {
	const bad = await run({ sub: "run", arg: "t", flow: "nope", dry: true });
	expect(bad.code).not.toBe("completed");
	expect(bad.text).toContain('no flow named "nope"');
	expect((await run({ sub: "wat" })).code).not.toBe("completed");
	const resumed = await run({ sub: "resume", arg: "flow-fix-nothing-here" });
	expect(resumed.code).not.toBe("completed");
	expect(resumed.text).toContain("no checkpoint for run");
});

it("says how to install the runtime when the optional packages are absent", async () => {
	const { code, text } = await run({
		sub: "run",
		arg: "do the thing",
		lang: () => Promise.reject(new Error("Cannot find module")),
	});
	expect(code).not.toBe("completed");
	expect(text).toContain("flusk flow needs the LangGraph runtime:");
	expect(text).toContain(langMissing());
});

it("validates its flags before anything runs", () => {
	expect(parseFlowArgs(["run"], {}, repo)).toMatchObject({ ok: false });
	expect(parseFlowArgs(["nope"], {}, repo)).toMatchObject({ ok: false });
	expect(parseFlowArgs(["run", "t"], { "max-cost": "0" }, repo)).toMatchObject({ ok: false });
	const ok = parseFlowArgs(["run", "t"], { flow: "fix", "max-cost": "2" }, repo);
	expect(ok).toMatchObject({
		ok: true,
		opts: { sub: "run", arg: "t", flow: "fix", maxCostUsd: 2 },
	});
});
