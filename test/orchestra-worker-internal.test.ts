import { appendFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { internalWorker } from "../src/orchestra/worker-internal.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import { makeTool, setupTestHome, teardownTestHome } from "./helpers.js";
import { initRepo, makeCtx, makeSpec, makeTask } from "./orchestra-fixture.js";

afterEach(() => teardownTestHome());

const never = new AbortController().signal;

it("intersects spec.tools with the run's tools: it narrows, never adds", async () => {
	const repo = await setupTestHome("flusk-orch-tools-");
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	const tools = [
		makeTool("read", "parallel", async () => "r"),
		makeTool("write", "sequential", async () => "w"),
	];
	const worker = internalWorker(makeCtx(repo, provider, tools));
	// "bash" is not a tool this run has: naming it must yield nothing, not bash.
	const spec = makeSpec({ name: "reader", tools: ["read", "bash"] });
	const result = await worker.run(makeTask(spec, "look around", repo, never));

	expect(result.ok).toBe(true);
	const offered = provider.requests[0]?.tools.map((t) => t.name) ?? [];
	expect(offered).toContain("read");
	expect(offered).not.toContain("write");
	expect(offered).not.toContain("bash");
	// The absent tool is said out loud rather than silently dropped.
	expect(result.summary).toContain("bash");
});

it("an empty allow-list means no tools; an absent one means the default set", async () => {
	const repo = await setupTestHome("flusk-orch-tools2-");
	const tools = [makeTool("read", "parallel", async () => "r")];
	const none = new FakeProvider([{ message: assistantText("ok") }]);
	await internalWorker(makeCtx(repo, none, tools)).run(
		makeTask(makeSpec({ name: "thinker", tools: [] }), "think", repo, never),
	);
	expect(none.requests[0]?.tools.map((t) => t.name)).not.toContain("read");

	const all = new FakeProvider([{ message: assistantText("ok") }]);
	await internalWorker(makeCtx(repo, all, tools)).run(
		makeTask(makeSpec({ name: "worker" }), "work", repo, never),
	);
	expect(all.requests[0]?.tools.map((t) => t.name)).toContain("read");
});

it("a failing run is a WorkerResult, never a throw", async () => {
	const repo = await setupTestHome("flusk-orch-fail-");
	// An exhausted script ends the run with stopReason "error".
	const worker = internalWorker(makeCtx(repo, new FakeProvider([]), []));
	const result = await worker.run(makeTask(makeSpec({ name: "doomed" }), "do it", repo, never));

	expect(result.ok).toBe(false);
	expect(result.error).toContain("script exhausted");
	expect(result.summary).not.toBe("");
	expect(result.filesTouched).toEqual([]);
});

it("a spec for another worker is refused as a result, not run", async () => {
	const repo = await setupTestHome("flusk-orch-kind-");
	const worker = internalWorker(makeCtx(repo, new FakeProvider([]), []));
	const spec = makeSpec({ name: "elsewhere", worker: "cli", backendId: "claude" });

	expect(await worker.available(spec)).toMatchObject({ ok: false });
	const result = await worker.run(makeTask(spec, "do it", repo, never));
	expect(result.ok).toBe(false);
	expect(result.error).toContain('not "internal"');
});

it("filesTouched is observed from the working tree, not read out of the summary", async () => {
	const repo = await setupTestHome("flusk-orch-touch-");
	initRepo(repo);
	// Dirty BEFORE the delegation: one file the agent edits again (same porcelain
	// code throughout, so only a content hash catches it) and one it never opens.
	writeFileSync(join(repo, "already-dirty.txt"), "before\n");
	writeFileSync(join(repo, "untouched.txt"), "before\n");

	const scribble = makeTool("scribble", "sequential", async () => {
		writeFileSync(join(repo, "created.txt"), "new\n");
		appendFileSync(join(repo, "already-dirty.txt"), "more\n");
		return "wrote nothing";
	});
	const provider = new FakeProvider([
		{ message: assistantToolCalls([{ id: "c1", name: "scribble", args: {} }]) },
		{ message: assistantText("I did not change any files.") },
	]);
	const worker = internalWorker(makeCtx(repo, provider, [scribble]));
	const result = await worker.run(makeTask(makeSpec({ name: "scribbler" }), "edit", repo, never));

	expect(result.ok).toBe(true);
	expect(result.summary).toContain("I did not change any files.");
	// realpath: the jail reports the resolved path, and macOS tmpdirs are links.
	const real = realpathSync(repo);
	expect(result.filesTouched).toEqual([join(real, "already-dirty.txt"), join(real, "created.txt")]);
	expect(result.costUsd).toBeUndefined(); // never estimated
});
