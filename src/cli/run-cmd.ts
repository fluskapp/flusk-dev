import { readFile } from "node:fs/promises";
import { createAgent } from "../agent/agent.js";
import { createEventBus } from "../core/events.js";
import type { AssistantMsg, ModelRef, RunEndReason } from "../core/types.js";
import { zeroUsage } from "../core/types.js";
import {
	assistantText,
	assistantToolCalls,
	FakeProvider,
	type ScriptedTurn,
} from "../provider/fake.js";
import { allowAllPolicy } from "../safety/policy.js";
import { bashTool } from "../tools/bash.js";
import { readTool } from "../tools/read.js";
import { attachRenderer } from "./render.js";

export interface RunCmdOpts {
	task: string;
	repo: string;
	/** Path to a JSON file with an array of ScriptedTurn entries. */
	fake?: string;
	maxTurns?: number;
	quiet?: boolean;
	out?: NodeJS.WritableStream;
}

const fakeModel: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

/** Built-in script used when --fake is not given: one tool call, then a wrap-up. */
function demoScript(): ScriptedTurn[] {
	const finale = "Demo complete — the loop, tools, sessions and renderer all work.";
	return [
		{
			message: assistantToolCalls([
				{ id: "demo-1", name: "bash", args: { command: "echo hello from hit" } },
			]),
		},
		{ deltas: [{ channel: "text", text: finale }], message: assistantText(finale) },
	];
}

/** Parses a --fake JSON array, filling missing deltas ([]) and usage (zeros). */
function normalizeScript(raw: unknown, source: string): ScriptedTurn[] {
	if (!Array.isArray(raw)) throw new Error(`fake script must be a JSON array: ${source}`);
	return raw.map((entry, i) => {
		const turn = entry as { deltas?: ScriptedTurn["deltas"]; message?: Partial<AssistantMsg> };
		const msg = turn?.message;
		if (
			msg === undefined ||
			msg.role !== "assistant" ||
			!Array.isArray(msg.content) ||
			typeof msg.stopReason !== "string"
		) {
			throw new Error(`fake script entry ${i} lacks a valid assistant message: ${source}`);
		}
		const usage =
			typeof msg.usage === "object" && msg.usage !== null
				? { ...zeroUsage(), ...msg.usage }
				: zeroUsage();
		return {
			deltas: turn.deltas ?? [],
			message: { ...msg, usage } as AssistantMsg,
		};
	});
}

/**
 * Phase 1 run command: always a FakeProvider (from --fake JSON or the demo
 * script), read + bash tools, allow-all policy. Never calls process.exit;
 * returns the RunEndReason for main.ts to map to an exit code.
 */
export async function runCmd(opts: RunCmdOpts): Promise<RunEndReason> {
	const out = opts.out ?? process.stdout;
	const script =
		opts.fake !== undefined
			? normalizeScript(JSON.parse(await readFile(opts.fake, "utf8")), opts.fake)
			: demoScript();
	const events = createEventBus();
	if (!opts.quiet) attachRenderer(events, out);
	const agent = createAgent({
		provider: new FakeProvider(script),
		model: fakeModel,
		tools: [readTool, bashTool],
		task: opts.task,
		repoRoot: opts.repo,
		policy: allowAllPolicy,
		events,
		limits: { maxTurns: opts.maxTurns ?? 100 },
	});
	try {
		const { reason, stats } = await agent.run();
		const cost = `$${stats.usage.costUsd.toFixed(4)}`;
		out.write(`${reason} · ${stats.turns} turns · ${cost} · ${agent.session.path}\n`);
		return reason;
	} finally {
		agent.session.close();
	}
}
