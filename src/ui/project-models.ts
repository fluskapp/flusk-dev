/**
 * What a project runs *with*: the models it routes to, the tools it can
 * call, and the prompt it hands its model. flusk answers from its own config
 * and code; a harness answers from its config.json, its learned benchmarks
 * (data/benchmarks.json: {kind: {tool: score}}) and whichever prompt file
 * it keeps — the shapes are read off the real linof-harness, not guessed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSystemPrompt } from "../agent/system-prompt.js";
import { DEFAULT_TOOLS } from "../cli/run-support.js";
import type { FluskConfig } from "../config/types.js";
import type { ModelRef as CoreModelRef } from "../core/types.js";
import type { ModelRef } from "./api-types.js";
import type { Journal } from "./journal-scan.js";

const PROMPT_MAX = 8000;
const MODEL_LIMIT = 24;
/** buildSystemPrompt wants a model; the dashboard is not routing a run. */
const PLACEHOLDER: CoreModelRef = { provider: "…", id: "…", contextWindow: 0 };

export interface PromptRef {
	source: string;
	text: string;
}

export const fluskModels = (cfg: FluskConfig): ModelRef[] =>
	Object.entries(cfg.models).map(([role, m]) => ({ id: `${m.provider}/${m.id}`, role }));

export const fluskTools = (): string[] => [...DEFAULT_TOOLS.map((t) => t.name), "task"];

export const fluskPrompt = (repoRoot: string): PromptRef => ({
	source: "src/agent/system-prompt.ts",
	text: buildSystemPrompt({ repoRoot, cwd: repoRoot, model: PLACEHOLDER }),
});

/** Candidate CLIs/models from config.json crossed with learned scores. */
export function harnessModels(
	tools: string[],
	benchmarks: Record<string, Record<string, number>>,
): ModelRef[] {
	const out: ModelRef[] = [];
	for (const id of tools) {
		const scored = Object.entries(benchmarks).filter(([, row]) => typeof row[id] === "number");
		if (scored.length === 0) out.push({ id });
		for (const [role, row] of scored)
			out.push({ id, role, score: Number((row[id] ?? 0).toFixed(4)) });
	}
	return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, MODEL_LIMIT);
}

/** {kind: {tool: score}} — anything else in the file is ignored. */
export function benchmarkTable(raw: unknown): Record<string, Record<string, number>> {
	const out: Record<string, Record<string, number>> = {};
	if (typeof raw !== "object" || raw === null) return out;
	for (const [kind, row] of Object.entries(raw as Record<string, unknown>)) {
		if (typeof row !== "object" || row === null) continue;
		const scores: Record<string, number> = {};
		for (const [tool, score] of Object.entries(row as Record<string, unknown>))
			if (typeof score === "number") scores[tool] = score;
		if (Object.keys(scores).length > 0) out[kind] = scores;
	}
	return out;
}

export const stringList = (raw: unknown): string[] | undefined =>
	Array.isArray(raw) && raw.every((v) => typeof v === "string") ? (raw as string[]) : undefined;

/**
 * Candidate models/CLIs a harness routes between. `tools` is the key the real
 * linof-harness uses for exactly this, so it is the last resort — but a
 * harness that names `models` or `candidates` separately is taken at its word,
 * which is what keeps this list from being the same array `harnessTools`
 * returns printed under a second heading.
 */
export function harnessCandidates(config: Record<string, unknown>): string[] {
	return (
		stringList(config.models) ?? stringList(config.candidates) ?? stringList(config.tools) ?? []
	);
}

/**
 * What the harness can DO: its declared capabilities, else the pipeline stage
 * names its journals record. Never `config.tools` — that names the models it
 * picks between (see `harnessCandidates`), and rendering one list under both
 * "Models" and "Tools" tells a reader nothing twice.
 */
export function harnessTools(config: Record<string, unknown>, journals: Journal[]): string[] {
	const declared = stringList(config.capabilities) ?? stringList(config.stages);
	if (declared !== undefined) return declared;
	const stages = new Set<string>();
	for (const j of journals) for (const s of j.stages) stages.add(s.name);
	return [...stages];
}

function listDir(dir: string): string[] {
	try {
		return readdirSync(dir).sort();
	} catch {
		return [];
	}
}

/** prompts/*.md, then src/prompt*.js, then AGENTS.md, then CLAUDE.md. */
function promptCandidates(root: string): string[] {
	return [
		...listDir(join(root, "prompts"))
			.filter((f) => f.endsWith(".md"))
			.map((f) => join("prompts", f)),
		...listDir(join(root, "src"))
			.filter((f) => /^prompt.*\.(js|mjs|cjs|ts)$/.test(f))
			.map((f) => join("src", f)),
		"AGENTS.md",
		"CLAUDE.md",
	];
}

/**
 * A prompt the view can trust. Silently serving the first 8000 characters of
 * a longer file is the worst outcome available: the reader reasons about — and
 * argues with — instructions that were never there. When it is cut, the cut
 * says so and names the file to open.
 */
export function harnessPrompt(root: string): PromptRef | undefined {
	for (const rel of promptCandidates(root)) {
		const source = join(root, rel);
		try {
			const raw = readFileSync(source, "utf8");
			if (raw.trim() === "") continue;
			if (raw.length <= PROMPT_MAX) return { source, text: raw };
			const note = `… truncated: showing ${PROMPT_MAX} of ${raw.length} characters — open ${source}`;
			return { source, text: `${raw.slice(0, PROMPT_MAX)}\n\n${note}` };
		} catch {
			// not this one — keep looking
		}
	}
	return undefined;
}
