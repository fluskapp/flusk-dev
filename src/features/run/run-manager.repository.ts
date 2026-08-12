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
import { loadConfig } from "../../platform/config/config.js";
import { createEventBus } from "../../platform/events/events.js";
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
	/** Resolves when the loop ends, however it ends. */
	done: Promise<string>;
}

const live = new Map<string, LiveRun>();

export const getLiveRun = (runId: string): LiveRun | undefined => live.get(runId);
export const listLiveRuns = (): LiveRun[] => [...live.values()];

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
	const run: LiveRun = { runId, task, feed, abort: () => agent.abort(), done };
	live.set(runId, run);
	return run;
}
