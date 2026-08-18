/**
 * JSON → RunConfig, shape only. Unknown keys are refused with a reason — the
 * SpecScan.skipped idiom, so a hand-edited file that drifts from the schema
 * greys out in the dialog instead of silently losing a field. Semantic rules
 * (exactly one of task | spec, the duration grammar, root membership) live in
 * runconfig-validate.ts: a config the dialog must open for FIXING still parses.
 */
import type { RunConfig } from "./runconfig.types.js";

const KEYS = new Set([
	"type", "task", "spec", "repo", "kind", "model", "budgets", "verify", "isolation", "fake", "tags",
	"harness",
]);
const KINDS = new Set(["plan", "code", "review", "summarize"]);
const SUB_KEYS: Record<"budgets" | "isolation", Record<string, "number" | "string" | "boolean">> = {
	budgets: { maxCostUsd: "number", for: "string", maxTurns: "number" },
	isolation: { none: "boolean", allowDirty: "boolean", container: "boolean" },
};

export type ParsedConfig = { ok: true; config: RunConfig } | { ok: false; why: string };

const refuse = (why: string): ParsedConfig => ({ ok: false, why });

const record = (v: unknown): Record<string, unknown> | null =>
	typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** The first thing wrong with a sub-object, or null. */
function subWhy(v: unknown, name: "budgets" | "isolation"): string | null {
	if (v === undefined) return null;
	const o = record(v);
	if (o === null) return `"${name}" must be an object`;
	for (const [k, val] of Object.entries(o)) {
		const want = SUB_KEYS[name][k];
		if (want === undefined) return `unknown key "${name}.${k}"`;
		if (val !== undefined && typeof val !== want) return `"${name}.${k}" must be a ${want}`;
	}
	return null;
}

export function parseRunConfig(raw: unknown): ParsedConfig {
	const o = record(raw);
	if (o === null) return refuse("not a JSON object");
	const extra = Object.keys(o).find((k) => !KEYS.has(k));
	if (extra !== undefined) return refuse(`unknown key "${extra}"`);
	if (o.type !== "task") return refuse('type must be "task"');
	for (const key of ["task", "spec", "repo", "model", "fake", "harness"] as const) {
		if (o[key] !== undefined && typeof o[key] !== "string") return refuse(`"${key}" must be a string`);
	}
	if (o.kind !== undefined && !(typeof o.kind === "string" && KINDS.has(o.kind))) {
		return refuse('"kind" must be plan, code, review or summarize');
	}
	if (o.verify !== undefined && typeof o.verify !== "boolean") return refuse('"verify" must be a boolean');
	if (o.tags !== undefined && !(Array.isArray(o.tags) && o.tags.every((t) => typeof t === "string"))) {
		return refuse('"tags" must be an array of strings');
	}
	for (const name of ["budgets", "isolation"] as const) {
		const why = subWhy(o[name], name);
		if (why !== null) return refuse(why);
	}
	return { ok: true, config: o as unknown as RunConfig };
}

/** File text → RunConfig; invalid JSON becomes the skip reason. */
export function parseRunConfigText(text: string): ParsedConfig {
	try {
		return parseRunConfig(JSON.parse(text) as unknown);
	} catch (e) {
		return refuse(e instanceof Error ? e.message : String(e));
	}
}
