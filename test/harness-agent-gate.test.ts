/**
 * runWithGate drives a foreign harness exactly like a native run: the first
 * invocation fails the repo's verify command, the gate steers a retry
 * (continueRun re-prompts with the evidence), the second invocation fixes it
 * — gate decision "completed" with retries: 1 in the session. Abort
 * mid-stream resolves "aborted".
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";
import { afterEach, beforeEach, expect, test } from "vitest";
import { runWithGate } from "../src/cli/gate-loop.js";
import { createHarnessAgent } from "../src/features/harnesses/harness-agent.repository.js";
import type { HarnessMeta } from "../src/features/harnesses/harness.types.js";
import { lastGate } from "../src/features/session/gate-fold.js";
import { loadConfig } from "../src/platform/config/config.js";
import { createEventBus } from "../src/platform/events/events.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
beforeEach(async () => {
	repo = await setupTestHome("flusk-hgate-");
});
afterEach(() => teardownTestHome());

const devnull = (): Writable =>
	new Writable({
		write(_c, _e, cb) {
			cb();
		},
	});

const meta = (args: string[]): HarnessMeta => ({
	type: "harness",
	kind: "script",
	command: process.execPath,
	args,
	id: "fixer",
	scope: "global",
	path: null,
	available: true,
});

test("a failing verify command steers a retry; the session carries the gate decision", async () => {
	// Shell-less fixture: first invocation leaves a BAD state, any later one
	// (the steered retry) writes the fix. Every prompt is logged for proof.
	const worker = join(repo, "worker.cjs");
	writeFileSync(
		worker,
		'const f=require("node:fs");const d=process.cwd();\n' +
			'f.appendFileSync(d+"/prompts.txt",process.argv[process.argv.length-1]+"\\n---\\n");\n' +
			'if(!f.existsSync(d+"/state.txt")){f.writeFileSync(d+"/state.txt","bad");process.stdout.write("did the work");}\n' +
			'else{f.writeFileSync(d+"/state.txt","good");process.stdout.write("cleaned up the state");}\n',
	);
	const check = join(repo, "check.cjs");
	writeFileSync(
		check,
		'const f=require("node:fs");\n' +
			'if(f.readFileSync(process.cwd()+"/state.txt","utf8")!=="good"){console.error("state is bad");process.exit(1);}\n',
	);
	const events = createEventBus();
	const agent = createHarnessAgent({
		meta: meta([worker]),
		task: "fix the state",
		repoRoot: repo,
		events,
		runId: "g1",
	});
	const verifyCmd = `"${process.execPath}" check.cjs`;
	const { outcome, reason } = await runWithGate(agent, {
		cfg: loadConfig(repo),
		repoRoot: repo,
		repoConfig: { verify: [verifyCmd] },
		store: null,
		ns: "",
		out: devnull(),
	});
	expect(reason).toBe("completed");
	expect(outcome).toBe("completed");
	expect(readFileSync(join(repo, "state.txt"), "utf8")).toBe("good");
	const gate = lastGate(agent.session.entries);
	expect(gate).toMatchObject({ outcome: "completed", retries: 1, verified: [verifyCmd] });
	// The steered second prompt carried the gate's failing evidence.
	const prompts = readFileSync(join(repo, "prompts.txt"), "utf8").split("---");
	expect(prompts[0]).toContain("fix the state");
	expect(prompts[1]).toContain("Verification failed");
	expect(prompts[1]).toContain("state is bad");
});

test("abort mid-stream resolves aborted, with the run closed out once", async () => {
	const slow = join(repo, "slow.cjs");
	writeFileSync(
		slow,
		'process.stdout.write("start\\n");setTimeout(()=>{process.stdout.write("end");},30000);\n',
	);
	const events = createEventBus();
	const endReasons: string[] = [];
	events.on("run:end", (e) => void endReasons.push(e.reason));
	const agent = createHarnessAgent({
		meta: meta([slow]),
		task: "sleep",
		repoRoot: repo,
		events,
		runId: "g2",
	});
	events.on("assistant:delta", () => agent.abort());
	const { reason } = await agent.run();
	expect(reason).toBe("aborted");
	expect(endReasons).toEqual(["aborted"]);
	// A dead agent stays dead: a continue after abort() aborts immediately.
	const cont = await agent.continueRun("more");
	expect(cont.reason).toBe("aborted");
}, 15000);
