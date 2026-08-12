import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/features/run/agent.js";
import type { FluskEvent } from "../src/platform/events/events.js";
import type { ModelRef, ToolResultMsg } from "../src/features/run/run.types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/features/provider/fake.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { readTool } from "../src/features/tools/read.repository.js";
import { spyRunEnds } from "./helpers.js";

const model: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };
const EVENT_TYPES: FluskEvent["type"][] = [
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
	tmp = await mkdtemp(join(tmpdir(), "flusk-loop-basic-"));
	process.env.FLUSK_HOME = join(tmp, "home");
	repo = join(tmp, "repo");
	await mkdir(repo, { recursive: true });
	await writeFile(join(repo, "package.json"), '{\n\t"name": "demo-pkg"\n}\n');
});

afterAll(() => {
	delete process.env.FLUSK_HOME;
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
	const agent = createAgent({
		provider,
		model,
		tools: [readTool],
		task: "read the package.json",
		repoRoot: repo,
	});
	const ends = spyRunEnds(agent.events);
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

	// The run is closed out exactly once, carrying the outcome.
	expect(ends).toEqual(["completed"]);

	// One provider request per turn, each carrying the base system prompt.
	expect(provider.requests).toHaveLength(2);
	expect(provider.requests[0]?.system).toContain("You are flusk, an autonomous coding agent.");
	expect(provider.requests[1]?.system).toBe(provider.requests[0]?.system);
	agent.session.close();
});
