/**
 * Launching a harness-backed run configuration. readHarness fresh off disk
 * IS the trust gate — the refusal carries the same note the dialog lists —
 * then the adapter runs under runWithGate, so verify commands, evidence-
 * steered retries, the claim-check and the session's gate decision come free
 * (H0 D8). `store: null` v1: foreign runs keep no fact record; the session
 * plus the gate decision are the record. Git isolation is NOT wired: the
 * child runs on the current branch.
 */
import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import { runWithGate } from "../../cli/gate-loop.js";
import { loadConfig, loadRepoConfig } from "../../platform/config/config.js";
import { createEventBus } from "../../platform/events/events.js";
import { type LiveRun, registerLiveRun } from "../run/run-manager.repository.js";
import { wireRunEvents } from "../run/run.events.js";
import type { DryReply, RunConfigMeta } from "../runconfig/runconfig.types.js";
import { detectVerifyCommands } from "../verify/detect.repository.js";
import { createHarnessAgent } from "./harness-agent.repository.js";
import { readHarness } from "./harness-files.repository.js";
import { streamOf } from "./harness-parse.js";

export type HarnessLaunched = { ok: true; run: LiveRun } | { ok: false; why: string };

/** The task label; a spec-bearing config keeps the placeholder idiom. */
const taskOf = (config: RunConfigMeta): string => {
	const task = config.task?.trim() ?? "";
	return task !== "" ? task : `(spec: ${config.spec ?? ""})`;
};

export async function startHarnessRun(config: RunConfigMeta, root: string): Promise<HarnessLaunched> {
	const opened = readHarness(root, config.harness ?? "");
	if (!opened.ok) return { ok: false, why: opened.why };
	if (!opened.meta.available) return { ok: false, why: opened.meta.note ?? "harness unavailable" };
	const runId = randomUUID().slice(0, 8);
	const events = createEventBus();
	const feed = wireRunEvents(events, runId);
	const task = taskOf(config);
	const agent = createHarnessAgent({ meta: opened.meta, task, repoRoot: root, events, runId });
	const out = new Writable({
		write(_chunk, _enc, cb) {
			cb(); // the gate narrates to the CLI; the app reads the session
		},
	});
	const done = runWithGate(agent, {
		cfg: loadConfig(root),
		repoRoot: root,
		repoConfig: loadRepoConfig(root),
		store: null,
		ns: "",
		out,
		noVerify: config.verify === false,
	})
		.then((r) => r.outcome as string)
		.catch((e) => `error: ${e instanceof Error ? e.message : String(e)}`)
		.finally(() => feed.close());
	const run: LiveRun = {
		runId,
		task,
		feed,
		abort: () => agent.abort(),
		steer: (text) => agent.steer(text),
		done,
	};
	registerLiveRun(run);
	return { ok: true, run };
}

/** The harness dry plan — nothing spawns. The trust verdict and the verify
 * commands the gate would run are the load-bearing lines; prompt elided. */
export function dryHarnessPlan(config: RunConfigMeta, root: string): DryReply {
	const opened = readHarness(root, config.harness ?? "");
	if (!opened.ok) return { ok: false, why: opened.why };
	const m = opened.meta;
	const verify =
		config.verify === false
			? ["(skipped: verify=false)"]
			: detectVerifyCommands(root, loadRepoConfig(root));
	const lines = [
		`harness: ${m.id} (${m.scope})`,
		`command: ${[m.command, ...(m.args ?? []), "<prompt>"].join(" ")}`,
		`cwd: ${root}`,
		`stream: ${streamOf(m)}`,
		`trust: ${m.available ? "available" : `refused — ${m.note ?? "unavailable"}`}`,
		`verify: ${verify.length > 0 ? verify.join(" && ") : "(none detected)"}`,
	];
	return { ok: true, plan: `${lines.join("\n")}\n` };
}
