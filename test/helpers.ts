import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ahHome } from "../src/session/paths.js";
import { Type } from "typebox";
import { createAgent } from "../src/agent/agent.js";
import type { ModelRef, ToolResultMsg } from "../src/core/types.js";
import type { MemoryPort, RunRecord } from "../src/memory/port.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import type { Tool } from "../src/tools/tool.js";

export const fakeModel: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

export const noParams = Type.Object({});

/** Creates a tmpdir, points AH_HOME inside it, and returns a repo dir path. */
export async function setupTestHome(prefix: string): Promise<string> {
	const tmp = await mkdtemp(join(tmpdir(), prefix));
	process.env.AH_HOME = join(tmp, "home");
	const repo = join(tmp, "repo");
	await mkdir(repo, { recursive: true });
	return repo;
}

export function teardownTestHome(): void {
	delete process.env.AH_HOME;
}

/**
 * Writes ~/.ah/config.json for the current AH_HOME.
 *
 * Memory TRANSPORT (baseUrl, apiKey, autoSpawn, serverBin, dataDir) belongs
 * here and nowhere else: loadConfig refuses those keys from a repo's own
 * .ah.json, because a cloned repo authors that file and could otherwise point
 * the client at a server of its choosing while inheriting the user's key.
 */
export async function writeHomeConfig(data: unknown): Promise<void> {
	const home = ahHome();
	await mkdir(home, { recursive: true });
	await writeFile(join(home, "config.json"), JSON.stringify(data));
}

export function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

export function makeTool(
	name: string,
	mode: "sequential" | "parallel",
	execute: () => Promise<string>,
): Tool {
	return {
		name,
		mode,
		description: `test tool ${name}`,
		parameters: noParams,
		execute: async () => ({ output: await execute() }),
	};
}

export const pingTool: Tool = {
	name: "ping",
	description: "test tool",
	parameters: Type.Object({}),
	mode: "parallel",
	execute: async () => ({ output: "pong" }),
};

export function spyMemory(): { memory: MemoryPort; postRuns: RunRecord[] } {
	const postRuns: RunRecord[] = [];
	return {
		postRuns,
		memory: {
			preTurn: async () => null,
			postRun: async (run) => {
				postRuns.push(run);
			},
			tools: () => [],
		},
	};
}

/** Agent over a two-turn script: one tool-call batch, then a text wrap-up. */
export function runToolBatch(
	repo: string,
	tools: Tool[],
	calls: Array<{ id: string; name: string; args?: unknown }>,
) {
	const provider = new FakeProvider([
		{ message: assistantToolCalls(calls.map((c) => ({ args: {}, ...c }))) },
		{ message: assistantText("done") },
	]);
	const agent = createAgent({ provider, model: fakeModel, tools, task: "batch", repoRoot: repo });
	const batches: ToolResultMsg[][] = [];
	agent.events.on("turn:end", (e) => {
		if (e.toolResults.length > 0) batches.push(e.toolResults);
	});
	return { agent, provider, batches };
}
