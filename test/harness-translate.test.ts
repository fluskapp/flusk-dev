/**
 * Foreign stdout → session + bus. Canned claude stream-json runs through
 * streamCli's parser and the translator via the adapter: bus events arrive in
 * feed order, and the session carries the user msg, the assistant msg, the
 * run/model/turn decisions and the stats the result event reported. A
 * raw-text script lands as a single assistant message.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createHarnessAgent } from "../src/features/harnesses/harness-agent.repository.js";
import type { HarnessMeta } from "../src/features/harnesses/harness.types.js";
import type { DecisionEntry, MessageEntry } from "../src/features/session/entries.js";
import { createEventBus } from "../src/platform/events/events.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
beforeEach(async () => {
	repo = await setupTestHome("flusk-htranslate-");
});
afterEach(() => teardownTestHome());

const FIXTURE = fileURLToPath(new URL("./fixtures/claude-stream.jsonl", import.meta.url));

const meta = (args: string[], over: Partial<HarnessMeta> = {}): HarnessMeta => ({
	type: "harness",
	kind: "script",
	command: process.execPath,
	args,
	id: "fake-claude",
	scope: "global",
	path: null,
	available: true,
	...over,
});

/** node script that replays a canned stream; the appended prompt is ignored. */
function catScript(): string {
	const path = join(repo, "cat.cjs");
	writeFileSync(
		path,
		'const{readFileSync}=require("node:fs");process.stdout.write(readFileSync(process.argv[2],"utf8"));\n',
	);
	return path;
}

const messages = (agent: { session: { entries: unknown[] } }) =>
	(agent.session.entries as Array<{ type: string }>).filter(
		(e): e is MessageEntry => e.type === "message",
	);

test("claude stream-json becomes bus events in feed order and a truthful session", async () => {
	const events = createEventBus();
	const kinds: string[] = [];
	const watched = [
		"run:start", "turn:start", "assistant:delta", "tool:start", "tool:end", "turn:end", "run:end",
	] as const;
	for (const t of watched) events.on(t, () => void kinds.push(t));
	const agent = createHarnessAgent({
		meta: meta([catScript(), FIXTURE]),
		task: "read the file",
		repoRoot: repo,
		events,
		runId: "r1",
	});
	expect(agent.session.header.harness).toBe("fake-claude");
	expect(agent.session.header.model).toEqual({ provider: "external", id: "fake-claude", contextWindow: 0 });
	const { reason, stats } = await agent.run();
	expect(reason).toBe("completed");
	expect(stats.turns).toBe(2); // the result event's num_turns
	expect(stats.usage.costUsd).toBeCloseTo(0.0213778);
	// The fixture emits the tool_use before its one text delta ("done").
	expect(kinds).toEqual([
		"run:start", "turn:start", "tool:start", "tool:end", "assistant:delta", "turn:end", "run:end",
	]);
	const msgs = messages(agent);
	expect(msgs[0]?.msg).toEqual({ role: "user", content: "read the file" });
	const closing = msgs[1]?.msg;
	if (closing?.role !== "assistant") throw new Error("no assistant message");
	expect(closing.content).toEqual([{ type: "text", text: "done" }]);
	expect(closing.stopReason).toBe("end");
	const decisions = (agent.session.entries as Array<{ type: string }>)
		.filter((e): e is DecisionEntry => e.type === "decision")
		.map((e) => e.decision);
	expect(decisions.find((d) => d.kind === "run")).toEqual({ kind: "run", runId: "r1" });
	expect(decisions.find((d) => d.kind === "model")).toMatchObject({
		ref: "external/fake-claude",
		taskKind: "code",
		source: "config",
	});
	const turn = decisions.find((d) => d.kind === "turn");
	if (turn?.kind !== "turn") throw new Error("no turn decision");
	expect(turn.turn).toBe(1);
	expect(turn.tools).toHaveLength(1);
	expect(turn.tools[0]).toMatch(/^Read /);
	expect(turn.costUsd).toBeCloseTo(0.0213778);
});

test("a raw-text script lands as one assistant message with zeroed stats", async () => {
	const path = join(repo, "raw.cjs");
	writeFileSync(path, 'process.stdout.write("hello from codex");\n');
	const events = createEventBus();
	const agent = createHarnessAgent({
		meta: meta([path], { id: "raw-tool", stream: "text" }),
		task: "say hello",
		repoRoot: repo,
		events,
		runId: "r2",
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("completed");
	expect(stats.turns).toBe(1);
	expect(stats.usage).toEqual({ input: 0, output: 0, cacheRead: 0, costUsd: 0 });
	const msgs = messages(agent);
	expect(msgs).toHaveLength(2);
	const closing = msgs[1]?.msg;
	if (closing?.role !== "assistant") throw new Error("no assistant message");
	expect(closing.content).toEqual([{ type: "text", text: "hello from codex" }]);
});
