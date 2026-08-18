/**
 * Runs started FROM the app, held in the server process, each wired to its
 * own ring-buffer feed. This is what the SSE route reads: the loop emits into
 * the buffer synchronously, a browser drains it at whatever pace it manages,
 * and a renderer that dies mid-run leaves the loop entirely unaffected — the
 * property step 4 of the acceptance flow kills a renderer to prove.
 *
 * A repository by rule as well as by nature: starting a run reads fake
 * scripts off disk and ultimately spawns tools.
 */
import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import { loadConfig } from "../../platform/config/config.js";
import { createEventBus } from "../../platform/events/events.js";
import { runCmd } from "../../cli/run-cmd.js";
import type { RunCmdOpts } from "../../cli/run-opts.js";
import type { TaskKind } from "../../platform/config/types.js";
import { demoScript, loadFakeScript } from "../provider/fake-script.repository.js";
import { DEFAULT_TOOLS } from "../tools/toolbelt.js";
import { FakeProvider } from "../provider/fake.js";
import { createAgent } from "./agent.js";
import { type RunEventFeed, wireRunEvents } from "./run.events.js";

export interface LiveRun {
	runId: string;
	task: string;
	feed: RunEventFeed;
	abort: () => void;
	/** Mid-run user feedback, delivered before the next turn. */
	steer?: (text: string) => void;
	/** Resolves when the loop ends, however it ends. */
	done: Promise<string>;
}

const live = new Map<string, LiveRun>();

export const getLiveRun = (runId: string): LiveRun | undefined => live.get(runId);
export const listLiveRuns = (): LiveRun[] => [...live.values()];

/** Register an externally-constructed run (harness adapters) in the live map. */
export function registerLiveRun(run: LiveRun): void {
	live.set(run.runId, run);
	void run.done.finally(() => { if (live.size > 32) live.delete(run.runId); });
}

/**
 * Starts an offline (fake-scripted) run and returns its id immediately; the
 * loop proceeds in the background and its events accumulate in the feed. Only
 * the fake provider is reachable from the app for now — a real-provider start
 * is a policy decision (keys, budgets, isolation) the CLI still owns.
 */
export async function startFakeRun(task: string, fakeScript?: string): Promise<LiveRun> {
	const runId = randomUUID().slice(0, 8);
	const events = createEventBus();
	const feed = wireRunEvents(events, runId);
	const script = fakeScript === undefined ? demoScript() : await loadFakeScript(fakeScript);
	const agent = createAgent({
		provider: new FakeProvider(script),
		model: { provider: "fake", id: "fake-1", contextWindow: 200_000 },
		tools: DEFAULT_TOOLS,
		task,
		repoRoot: process.cwd(),
		config: loadConfig(process.cwd()),
		runId,
		events,
	});
	const done = agent
		.run()
		.then((r) => r.reason as string)
		.catch((e) => `error: ${e instanceof Error ? e.message : String(e)}`)
		.finally(() => {
			// The feed stays readable after the run ends (the tail of events is
			// still worth draining); it detaches from the bus, which is done.
			feed.close();
			// Retained so a late consumer can still read the ending; replaced
			// only when the map grows unreasonably.
			if (live.size > 32) live.delete(runId);
		});
	const run: LiveRun = {
		runId,
		task,
		feed,
		abort: () => agent.abort(),
		steer: (text) => agent.steer(text),
		done,
	};
	live.set(runId, run);
	return run;
}

/**
 * A REAL run started from the workbench, under exactly the CLI's machinery:
 * runCmd owns policy, isolation, the gate and the facts of record — the app
 * only injects the event bus its feed watches and captures the text output.
 * Refusing to reimplement any of that here is the point: a run started from
 * a window must not be one drop weaker than a run started from a shell.
 */
/** What the app may pass through to runCmd — the flags a run configuration
 * can set, a strict subset of RunCmdOpts. Pure pass-through: runCmd keeps
 * sole ownership of policy, keys, isolation and the gate. */
export type RealRunOpts = { task: string; repoRoot: string; kind?: string } & Pick<
	RunCmdOpts,
	| "spec" | "model" | "maxCostUsd" | "deadlineMs" | "maxTurns"
	| "noVerify" | "noIsolation" | "allowDirty" | "container" | "fake"
>;

export async function startRealRun(opts: RealRunOpts): Promise<LiveRun> {
	const runId = randomUUID().slice(0, 8);
	const events = createEventBus();
	const feed = wireRunEvents(events, runId);
	const lines: string[] = [];
	const out = new Writable({
		write(chunk: Buffer, _enc, cb) {
			lines.push(chunk.toString("utf8"));
			cb();
		},
	});
	let controls: { steer(text: string): void; abort(): void } | undefined;
	const { task, repoRoot, kind, ...extras } = opts;
	const done = runCmd({
		...extras,
		task,
		repo: repoRoot,
		real: true,
		...(kind !== undefined ? { kind: kind as TaskKind } : {}),
		quiet: true,
		out,
		events,
		onAgent: (agent) => {
			controls = agent;
		},
	})
		.then((outcome) => outcome as string)
		.catch((e) => `error: ${e instanceof Error ? e.message : String(e)}`)
		.finally(() => {
			feed.close();
			if (live.size > 32) live.delete(runId);
		});
	const run: LiveRun = {
		runId,
		task: opts.task,
		feed,
		abort: () => controls?.abort(),
		steer: (text) => controls?.steer(text),
		done,
	};
	live.set(runId, run);
	return run;
}
