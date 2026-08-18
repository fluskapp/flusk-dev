/**
 * JSON → HarnessSpec, shape only — the runconfig-parse closed-allowlist idiom:
 * an unknown key refuses the FILE with a reason, so a hand-edit that drifts
 * from the schema greys out instead of silently losing a field. A harness
 * spec names a binary a click will spawn, so nothing here is lenient.
 */
import type { HarnessSpec, HarnessStream } from "./harness.types.js";

const KEYS = new Set(["type", "kind", "command", "args", "env", "stream", "limits"]);
const KINDS = new Set<string>(["claude-code", "codex", "script"]);
const STREAMS = new Set<string>(["text", "claude-stream-json"]);

export type ParsedHarness = { ok: true; spec: HarnessSpec } | { ok: false; why: string };

const refuse = (why: string): ParsedHarness => ({ ok: false, why });

const record = (v: unknown): Record<string, unknown> | null =>
	typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export function parseHarnessSpec(raw: unknown): ParsedHarness {
	const o = record(raw);
	if (o === null) return refuse("not a JSON object");
	const extra = Object.keys(o).find((k) => !KEYS.has(k));
	if (extra !== undefined) return refuse(`unknown key "${extra}"`);
	if (o.type !== "harness") return refuse('type must be "harness"');
	if (!(typeof o.kind === "string" && KINDS.has(o.kind))) {
		return refuse('"kind" must be claude-code, codex or script');
	}
	if (typeof o.command !== "string" || o.command === "") {
		return refuse('"command" must be a non-empty string');
	}
	if (o.args !== undefined && !(Array.isArray(o.args) && o.args.every((a) => typeof a === "string"))) {
		return refuse('"args" must be an array of strings');
	}
	if (o.env !== undefined) {
		const env = record(o.env);
		if (env === null || Object.values(env).some((v) => typeof v !== "string")) {
			return refuse('"env" must be an object of string values');
		}
	}
	if (o.stream !== undefined && !(typeof o.stream === "string" && STREAMS.has(o.stream))) {
		return refuse('"stream" must be text or claude-stream-json');
	}
	if (o.limits !== undefined) {
		const limits = record(o.limits);
		if (limits === null) return refuse('"limits" must be an object');
		const unknown = Object.keys(limits).find((k) => k !== "maxMinutes");
		if (unknown !== undefined) return refuse(`unknown key "limits.${unknown}"`);
		if (limits.maxMinutes !== undefined && typeof limits.maxMinutes !== "number") {
			return refuse('"limits.maxMinutes" must be a number');
		}
	}
	return { ok: true, spec: o as unknown as HarnessSpec };
}

/** File text → HarnessSpec; invalid JSON becomes the skip reason. */
export function parseHarnessText(text: string): ParsedHarness {
	try {
		return parseHarnessSpec(JSON.parse(text) as unknown);
	} catch (e) {
		return refuse(e instanceof Error ? e.message : String(e));
	}
}

/** The schema's stream default by kind: claude-code is JSONL, the rest text. */
export const streamOf = (s: HarnessSpec): HarnessStream =>
	s.stream ?? (s.kind === "claude-code" ? "claude-stream-json" : "text");
