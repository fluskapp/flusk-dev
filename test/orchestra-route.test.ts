import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { FluskConfig } from "../src/config/types.js";
import { routeTask } from "../src/orchestra/route.js";
import type { AgentSpec } from "../src/orchestra/types.js";
import { createWorkers, workerLookup } from "../src/orchestra/workers.js";
import { FakeProvider } from "../src/provider/fake.js";
import { cfgWith, fakeRegistry, makeCtx, makeSpec } from "./orchestra-fixture.js";

let repo: string;
let cfg: FluskConfig;
let workerFor: ReturnType<typeof workerLookup>;

const REVIEW_DESC = "Use to review a diff for correctness bugs";
const REVIEW_TASK = "review this diff for correctness bugs";

beforeAll(() => {
	repo = mkdtempSync(join(tmpdir(), "flusk-orch-route-"));
	cfg = cfgWith([
		// A CLI backend whose binary is not installed on this machine.
		{ id: "missing", kind: "cli", command: "flusk-no-such-cli-77c1", args: [] },
		{ id: "local", kind: "openai-compatible", baseUrl: "http://127.0.0.1:1/v1", model: "small" },
	]);
	workerFor = workerLookup(createWorkers(cfg, makeCtx(repo, new FakeProvider([]), [])));
});

afterAll(() => rmSync(repo, { recursive: true, force: true }));

const route = (
	task: string,
	specs: AgentSpec[],
	scores?: Parameters<typeof routeTask>[0]["scores"],
) =>
	routeTask({
		task,
		registry: fakeRegistry(specs),
		workerFor,
		config: cfg,
		...(scores ? { scores } : {}),
	});

it("routes on description and never to an agent that cannot run", async () => {
	// Same description, so availability is the only difference — and the
	// unavailable one sorts FIRST by name, which is what makes this a test.
	const specs = [
		makeSpec({
			name: "cli-reviewer",
			description: REVIEW_DESC,
			worker: "cli",
			backendId: "missing",
		}),
		makeSpec({ name: "code-reviewer", description: REVIEW_DESC }),
	];
	const result = await route(REVIEW_TASK, specs);

	expect(result.ok).toBe(true);
	if (!result.ok) return;
	expect(result.kind).toBe("review");
	expect(result.spec.name).toBe("code-reviewer");
	// The rejected agent stays visible, with the reason it was rejected.
	const cli = result.candidates.find((c) => c.spec.name === "cli-reviewer");
	expect(cli).toMatchObject({ available: false });
	expect(cli?.reason).toContain("not found on PATH");
	expect(cli?.fit.description).toBeGreaterThan(0);
});

it("says nothing is available rather than falling back to something surprising", async () => {
	const specs = [
		makeSpec({
			name: "cli-reviewer",
			description: REVIEW_DESC,
			worker: "cli",
			backendId: "missing",
		}),
		makeSpec({
			name: "ghost",
			description: REVIEW_DESC,
			worker: "http",
			backendId: "not-configured",
		}),
	];
	const result = await route(REVIEW_TASK, specs);

	expect(result.ok).toBe(false);
	if (result.ok) return;
	expect(result.reason).toContain("no agent is available for this review task");
	expect(result.reason).toContain("not found on PATH");
	expect(result.reason).toContain('backend "not-configured" is not configured');
});

it("refuses to route when no available agent claims the job", async () => {
	const specs = [
		makeSpec({ name: "explorer", description: "Use to find where something lives in a codebase" }),
	];
	const result = await route(REVIEW_TASK, specs);

	expect(result.ok).toBe(false);
	if (result.ok) return;
	expect(result.reason).toContain("no available agent's description matches");
	expect(result.reason).toContain("explorer");
});

it("an empty registry is a clear answer, not a crash", async () => {
	const result = await route(REVIEW_TASK, []);
	expect(result).toMatchObject({ ok: false, reason: "no agents are registered" });
});

it("benchmarks break a tie between equally-matching agents, and only a tie", async () => {
	const desc = "Use to implement retry helpers in the http client";
	const task = "implement retry helpers in the http client";
	const twins = ["a-agent", "z-agent"].map((name, i) =>
		makeSpec({
			name,
			description: desc,
			worker: "http",
			backendId: "local",
			model: i === 0 ? "small" : "big",
		}),
	);
	// No benchmarks recorded: the tie breaks by name, deterministically.
	const plain = await route(task, twins);
	expect(plain.ok && plain.spec.name).toBe("a-agent");

	// The kind is "code", and local/big is the recorded winner for it.
	const scored = await route(task, twins, { code: { "local/big": 0.9, "local/small": 0.1 } });
	expect(scored.ok && scored.kind).toBe("code");
	expect(scored.ok && scored.spec.name).toBe("z-agent");

	// A better DESCRIPTION still beats a better benchmark: 0.75 coverage on an
	// unbenchmarked agent wins over 0.50 coverage on the top-scoring model.
	const claimant = makeSpec({ name: "b-agent", description: "Use to implement retry helpers" });
	const beaten = await route("implement retry helpers", [...twins, claimant], {
		code: { "local/big": 1 },
	});
	expect(beaten.ok && beaten.spec.name).toBe("b-agent");
});
