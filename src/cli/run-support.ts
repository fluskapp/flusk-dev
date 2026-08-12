/**
 * Shared run plumbing for the run/resume/goal commands: the default toolbelt,
 * fake-provider scripts, and model selection.
 */
import { readFile } from "node:fs/promises";
import type { FluskConfig, TaskKind } from "../platform/config/types.js";
import type { AssistantMsg, ModelRef } from "../features/run/run.types.js";
import { zeroUsage } from "../features/run/run.types.js";
import { assistantText, assistantToolCalls, type ScriptedTurn } from "../features/provider/fake.js";
import { resolveModelRef } from "../features/provider/pi-ai.js";
import { chooseModel } from "../features/provider/router.js";
import { loadScores } from "../features/provider/scores.repository.js";
import { bashTool } from "../features/tools/bash.repository.js";
import { editTool } from "../features/tools/edit.repository.js";
import { globTool } from "../features/tools/glob.repository.js";
import { grepTool } from "../features/tools/grep.repository.js";
import { readTool } from "../features/tools/read.repository.js";
import { writeTool } from "../features/tools/write.repository.js";

export const fakeModel: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };
export const DEFAULT_TOOLS = [readTool, bashTool, writeTool, editTool, globTool, grepTool];

/** Conventional API-key env var for a provider (anthropic → ANTHROPIC_API_KEY). */
export const envKeyVar = (provider: string): string =>
	`${provider.toUpperCase().replace(/-/g, "_")}_API_KEY`;

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

export async function pickModel(cfg: FluskConfig, kind: TaskKind, override?: string): Promise<ModelRef> {
	if (override === undefined) return chooseModel(cfg, kind, await loadScores()).ref;
	const slash = override.indexOf("/");
	if (slash <= 0 || slash === override.length - 1) {
		throw new Error(`--model must look like "provider/id", got "${override}"`);
	}
	return resolveModelRef({ provider: override.slice(0, slash), id: override.slice(slash + 1) });
}
