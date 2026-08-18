/**
 * The DecisionLog end to end on a real (fake-provider) run: the harness
 * writes model/isolation/context entries when it decides, the gate's facts
 * land beside them, and `flusk explain` assembles the account without
 * touching the live session's lock.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { explainCmd, explainSession } from "../src/cli/explain-cmd.js";
import { runCmd } from "../src/cli/run-cmd.js";
import { capture } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-decisions-");
	mkdirSync(join(repo, ".git"), { recursive: true }); // not a real repo: isolation off
});
afterEach(() => teardownTestHome());

async function fakeRun(): Promise<string> {
	const { out } = capture();
	const outcome = await runCmd({
		task: "decide things",
		repo,
		out,
		quiet: true,
		noIsolation: true,
	});
	expect(outcome).toBe("completed");
	// The session path is discoverable via the home; explain resolves bare ids,
	// but here we scan for the one file the run just wrote.
	const { readdirSync } = await import("node:fs");
	const { fluskHome } = await import("../src/platform/paths/paths.js");
	const root = join(fluskHome(), "sessions");
	const slug = readdirSync(root)[0] as string;
	const file = readdirSync(join(root, slug))[0] as string;
	return join(root, slug, file);
}

it("a run writes its decisions down and explain assembles them in order", async () => {
	const path = await fakeRun();
	const log = await explainSession(path);
	expect(log.task).toBe("decide things");
	const kinds = log.decisions.map((d) => d.decision.kind);
	// Model and isolation first (written before the first turn), context when announced.
	expect(kinds.slice(0, 2)).toEqual(["model", "isolation"]);
	expect(kinds).toContain("context");
	const model = log.decisions[0]?.decision;
	if (model?.kind !== "model") throw new Error("first decision is not the model");
	expect(model.source).toBe("fake");
	expect(model.ref).toBe("fake/fake-1");
	const iso = log.decisions[1]?.decision;
	if (iso?.kind !== "isolation") throw new Error("second decision is not isolation");
	expect(iso.branch).toBeNull();
	expect(iso.why).toContain("--no-isolation");
	const ctx = log.decisions.find((d) => d.decision.kind === "context")?.decision;
	if (ctx?.kind !== "context") throw new Error("no context decision");
	expect(ctx.sources.length).toBeGreaterThan(0);
	// The gate ran (default verify detection finds nothing here — recorded honestly).
	expect(log.endReason).toBe("completed");
	const turns = log.decisions.filter((d) => d.decision.kind === "turn").map((d) => d.decision);
	expect(turns.length).toBeGreaterThan(0);
	const t0 = turns[0];
	if (t0?.kind !== "turn") throw new Error("no turn decision");
	expect(t0.turn).toBe(1);
	expect(typeof t0.costUsd).toBe("number");
});

it("explain renders prose with every section, and --json emits the object", async () => {
	const path = await fakeRun();
	const { out, text } = capture();
	expect(await explainCmd({ ref: path, out })).toBe(0);
	const prose = text();
	expect(prose).toContain("model      fake/fake-1");
	expect(prose).toContain("isolation  none");
	expect(prose).toContain("context    ");
	expect(prose).toContain("turn       1");
	const { out: jsonOut, text: jsonText } = capture();
	expect(await explainCmd({ ref: path, json: true, out: jsonOut })).toBe(0);
	const parsed = JSON.parse(jsonText());
	expect(parsed.decisions.length).toBeGreaterThanOrEqual(3);
});

it("gate facts join by the LOOP's run id, not the session id (the bug the linof proof caught)", async () => {
	const { writeFile, mkdir } = await import("node:fs/promises");
	await mkdir(join(repo, ".flusk"), { recursive: true });
	await writeFile(join(repo, ".flusk", "config.json"), JSON.stringify({ verify: ["true"] }));
	const path = await fakeRun();
	const log = await explainSession(path);
	// The session recorded which loop run served it…
	const runDecision = log.decisions.find((d) => d.decision.kind === "run");
	expect(runDecision).toBeDefined();
	// …and the gate's ledger is reachable through it.
	expect(log.gate).not.toBeNull();
	expect(log.gate?.verifiedBy).toContain("true");
	expect(log.gate?.outcome).toBe("completed");
});

it("a missing ref fails cleanly, not with a stack", async () => {
	const { out, text } = capture();
	expect(await explainCmd({ ref: "nope-nope", out })).toBe(1);
	expect(text()).toContain("no session matching");
});
