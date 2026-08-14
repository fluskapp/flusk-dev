/**
 * One config layer: the shape a JSON file may contribute, and the read that
 * turns a path into one. Split out from config.ts so the repo layer's file
 * resolution (repo-layer.ts) and the merge that trusts them differently
 * (config.ts) can share the reader without either importing the other.
 */
import { readFileSync } from "node:fs";
import type { FluskConfig } from "./types.js";

/** Any config layer: sections of FluskConfig, each partial. */
export interface ConfigLayer {
	models?: Partial<FluskConfig["models"]>;
	budgets?: Partial<FluskConfig["budgets"]>;
	unattended?: Partial<FluskConfig["unattended"]>;
	isolation?: Partial<FluskConfig["isolation"]>;
	compaction?: Partial<FluskConfig["compaction"]>;
	memory?: Partial<FluskConfig["memory"]>;
	context?: Partial<FluskConfig["context"]>;
	verify?: Partial<FluskConfig["verify"]>;
	containers?: Partial<FluskConfig["containers"]>;
	ui?: Partial<FluskConfig["ui"]>;
	chat?: Partial<FluskConfig["chat"]>;
	doc?: Partial<FluskConfig["doc"]>;
	watch?: Partial<FluskConfig["watch"]>;
}

/**
 * null when the file is absent; throws when it is present and malformed. The
 * distinction matters: a missing config is a choice, an unparseable one is a
 * mistake the user needs told about by path.
 */
export function readLayer(path: string): ConfigLayer | null {
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch {
		return null;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(`Malformed JSON in ${path}: ${detail}`);
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error(`Malformed config in ${path}: expected a JSON object`);
	}
	return parsed as ConfigLayer;
}
