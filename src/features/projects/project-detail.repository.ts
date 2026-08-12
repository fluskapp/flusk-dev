/**
 * One project in full: its summary plus what you would open an IDE to find
 * out — the models it routes to, the tools it can call, the prompt it runs
 * on, the commands it gates on, and its declarative config.
 *
 * flusk answers about itself from its own code and config; a harness answers
 * from config.json, data/benchmarks.json and whatever prompt file it keeps.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadRepoConfig } from "../../platform/config/config.js";
import type { FluskConfig } from "../../platform/config/types.js";
import { detectVerifyCommands } from "../verify/detect.repository.js";
import type { ProjectDetail } from "./projects.types.js";
import { medianSpend } from "./project-attention.js";
import {
	fluskModels,
	fluskPrompt,
	fluskTools,
	benchmarkTable,
	harnessCandidates,
	harnessModels,
	harnessPrompt,
	harnessTools,
	type PromptRef,
	stringList,
} from "./project-models.repository.js";
import { collectParts, type ProjectParts, projectSpend, summarize } from "./project-scan.repository.js";

const CONFIG_VALUE_MAX = 2000;
const CONFIG_TOTAL_MAX = 8000;

function readJson(path: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {}; // absent or malformed config costs the view nothing
	}
}

const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;

/**
 * Config is for reading; a webview has no use for a megabyte of JSON. A
 * dropped key keeps its NAME and says how big it was, because a silent drop
 * hides exactly the key you opened this view to read — and the summary above
 * it would still have counted it.
 */
function capConfig(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	let total = 0;
	for (const [key, value] of Object.entries(obj)) {
		const size = (JSON.stringify(value) ?? "").length;
		if (size > CONFIG_VALUE_MAX || total + size > CONFIG_TOTAL_MAX) {
			out[key] = `… omitted, ${kb(size)} — open the file`;
			continue;
		}
		total += size;
		out[key] = value;
	}
	return out;
}

/** flusk's own checkout — the one project whose internals we can speak for. */
const isAh = (p: ProjectParts): boolean =>
	existsSync(join(p.path, "src", "agent", "system-prompt.ts"));

/** .flusk/config.json verify[] wins; then a harness's declared verify; then detection. */
function verifyFor(root: string, harnessCfg: Record<string, unknown>): string[] {
	const repoCfg = loadRepoConfig(root);
	if (repoCfg?.verify !== undefined) return detectVerifyCommands(root, repoCfg);
	const declared = stringList(harnessCfg.verify);
	return detectVerifyCommands(
		root,
		declared === undefined ? repoCfg : { ...repoCfg, verify: declared },
	);
}

export function projectDetail(
	cfg: FluskConfig,
	name: string,
	now: Date = new Date(),
): ProjectDetail | null {
	const parts = collectParts(cfg);
	const p = parts.find((x) => x.name === name);
	if (p === undefined) return null;
	const summary = summarize(p, now.getTime(), medianSpend(parts.map(projectSpend)));
	const harnessCfg = readJson(join(p.path, "config.json"));
	const own = isAh(p);
	const prompt: PromptRef | undefined = own ? fluskPrompt(p.path) : harnessPrompt(p.path);
	const benchmarks = benchmarkTable(readJson(join(p.path, "data", "benchmarks.json")));
	return {
		...summary,
		models: own ? fluskModels(cfg) : harnessModels(harnessCandidates(harnessCfg), benchmarks),
		tools: own ? fluskTools() : harnessTools(harnessCfg, p.journals),
		...(prompt !== undefined ? { systemPrompt: prompt } : {}),
		verify: verifyFor(p.path, harnessCfg),
		config: capConfig({ ...readJson(join(p.path, ".flusk/config.json")), ...harnessCfg }),
	};
}
