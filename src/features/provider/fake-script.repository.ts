/**
 * Fake-provider scripts as data on disk: the built-in demo, and --fake files.
 * Lives in the provider feature (it is the FakeProvider's input format); the
 * CLI and the app's run manager both consume it from here.
 */
import { readFile } from "node:fs/promises";
import type { AssistantMsg } from "../run/run.types.js";
import { zeroUsage } from "../run/run.types.js";
import { assistantText, assistantToolCalls, type ScriptedTurn } from "./fake.js";

/** Built-in script used when --fake is not given: one tool call, then a wrap-up. */
export function demoScript(): ScriptedTurn[] {
	const finale = "Demo complete — the loop, tools, sessions and renderer all work.";
	return [
		{ message: assistantToolCalls([{ id: "demo-1", name: "bash", args: { command: "echo hello from flusk" } }]) },
		{ deltas: [{ channel: "text", text: finale }], message: assistantText(finale) },
	];
}

/** Parses a --fake JSON array, filling missing deltas ([]) and usage (zeros). */
export async function loadFakeScript(source: string): Promise<ScriptedTurn[]> {
	const raw: unknown = JSON.parse(await readFile(source, "utf8"));
	if (!Array.isArray(raw)) throw new Error(`fake script must be a JSON array: ${source}`);
	return raw.map((entry, i) => {
		const turn = entry as { deltas?: ScriptedTurn["deltas"]; message?: Partial<AssistantMsg> };
		const msg = turn?.message;
		if (msg?.role !== "assistant" || !Array.isArray(msg.content) || typeof msg.stopReason !== "string") {
			throw new Error(`fake script entry ${i} lacks a valid assistant message: ${source}`);
		}
		const usage = typeof msg.usage === "object" && msg.usage !== null ? { ...zeroUsage(), ...msg.usage } : zeroUsage();
		return { deltas: turn.deltas ?? [], message: { ...msg, usage } as AssistantMsg };
	});
}
