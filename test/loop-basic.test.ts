import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import type { AhEvent } from "../src/core/events.js";
import type { ModelRef, ToolResultMsg } from "../src/core/types.js";
import type { MemoryPort, RunRecord, TurnContext } from "../src/memory/port.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import { Session } from "../src/session/session.js";
import { readTool } from "../src/tools/read.js";

const model: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };
const EVENT_TYPES: AhEvent["type"][] = [
	"run:start",
	"turn:start",
	"assistant:delta",
	"tool:start",
	"tool:update",
	"tool:end",
	"turn:end",
	"compaction",
	"run:end",
];

let tmp: string;
let repo: string;

beforeAll(async () => {
	tmp = await mkdtemp(join(tmpdir(), "ah-loop-basic-"));
	process.env.AH_HOME = join(tmp, "home");
	repo = join(tmp, "repo");
	await mkdir(repo, { recursive: true });
	await writeFile(join(repo, "package.json"), '{\n\t"name": "demo-pkg"\n}\n');
});

afterAll(() => {
	delete process.env.AH_HOME;
});

test("full loop: read tool turn then completion", async () => {
	const provider = new FakeProvider([
		{
			message: assistantToolCalls(
				[{ id: "c1", name: "read", args: { file_path: "package.json" } }],
				"reading the manifest",
			),
		},
		{ message: assistantText("done") },
	]);
	const preTurns: TurnContext[] = [];
	const postRuns: RunRecord[] = [];
	const memory: MemoryPort = {
		preTurn: async (ctx) => {
			preTurns.push(ctx);
			return ctx.isFirstTurn ? "<memory>this repo is called demo-pkg</memory>" : null;
		},
		postRun: async (run) => {
			postRuns.push(run);
		},
		tools: () => [],
	};
	const agent = createAgent({
		provider,
		model,
		tools: [readTool],
		memory,
		task: "read the package.json",
		repoRoot: repo,
	});
	const seen: string[] = [];
	for (const type of EVENT_TYPES) {
		agent.events.on(type, () => {
			seen.push(type);
		});
	}

	const { reason, stats } = await agent.run();
	expect(reason).toBe("completed");
	expect(stats.turns).toBe(2);
	expect(stats.endedAt).toBeDefined();

	// The tool result carries the file content.
	const context = agent.session.buildContext();
	const toolResult = context.find((m): m is ToolResultMsg => m.role === "toolResult");
	expect(toolResult).toBeDefined();
	expect(toolResult?.isError).toBe(false);
	expect(toolResult?.output).toContain('"name": "demo-pkg"');
	expect(toolResult?.callId).toBe("c1");

	// Session file replays to the exact final context.
	const replayed = Session.load(agent.session.path);
	expect(replayed.buildContext()).toEqual(context);
	// task msg, assistant toolUse, tool result, assistant done
	expect(context).toHaveLength(4);
	expect(context[0]).toEqual({ role: "user", content: "read the package.json" });

	// Event order is sane.
	expect(seen[0]).toBe("run:start");
	expect(seen.at(-1)).toBe("run:end");
	expect(seen.filter((t) => t === "turn:start")).toHaveLength(2);
	expect(seen.filter((t) => t === "turn:end")).toHaveLength(2);
	expect(seen.indexOf("turn:start")).toBeLessThan(seen.indexOf("tool:start"));
	expect(seen.indexOf("tool:start")).toBeLessThan(seen.indexOf("tool:end"));
	expect(seen.indexOf("tool:end")).toBeLessThan(seen.indexOf("turn:end"));

	// postRun called exactly once, with the full transcript tail.
	expect(postRuns).toHaveLength(1);
	expect(postRuns[0]?.outcome).toBe("completed");
	expect(postRuns[0]?.sessionId).toBe(agent.session.id);
	expect(postRuns[0]?.transcriptTail).toEqual(context);

	// preTurn text lands in the first request's system prompt only.
	expect(preTurns).toHaveLength(2);
	expect(preTurns[0]?.isFirstTurn).toBe(true);
	expect(preTurns[1]?.isFirstTurn).toBe(false);
	expect(provider.requests).toHaveLength(2);
	expect(provider.requests[0]?.system).toContain("You are ah, an autonomous coding agent.");
	expect(provider.requests[0]?.system).toContain("<memory>this repo is called demo-pkg</memory>");
	expect(provider.requests[1]?.system).not.toContain("<memory>");
	agent.session.close();
});
