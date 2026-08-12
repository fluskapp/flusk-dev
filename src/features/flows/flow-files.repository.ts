/**
 * User flows on disk: `<project>/.flusk/flows/*.json` and `<fluskHome>/flows/*.json`.
 *
 * Split from library.ts so that file owns the built-in shapes and this one owns
 * reading a directory. A bad file names the field that is wrong and is skipped
 * ALONE — one malformed flow must never cost a user the other five.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fluskHome } from "../../platform/paths/paths.js";
import { BUILT_IN, parseFlowSpec } from "./library.js";
import type { FlowSpec } from "./types.js";

/** Not a flow: flow-stats.ts owns this name under the same directory. */
const RESERVED = new Set(["stats.json"]);

async function readDir(dir: string): Promise<LoadedFlows> {
	const flows: FlowSpec[] = [];
	const errors: string[] = [];
	let names: string[] = [];
	try {
		names = (await readdir(dir)).filter((n) => n.endsWith(".json") && !RESERVED.has(n)).sort();
	} catch {
		return { flows, errors }; // no flows directory is the normal case
	}
	for (const name of names) {
		const at = join(dir, name);
		try {
			flows.push(parseFlowSpec(JSON.parse(await readFile(at, "utf8")), at));
		} catch (e) {
			errors.push(e instanceof Error ? e.message : String(e));
		}
	}
	return { flows, errors };
}

export interface LoadedFlows {
	flows: FlowSpec[];
	errors: string[];
}

/** Project flows, then home flows, then the built-ins; first name wins. */
export async function loadFlows(projectRoot: string): Promise<LoadedFlows> {
	const local = await readDir(join(projectRoot, ".flusk", "flows"));
	const home = await readDir(join(fluskHome(), "flows"));
	const flows: FlowSpec[] = [];
	for (const f of [...local.flows, ...home.flows, ...BUILT_IN]) {
		if (!flows.some((seen) => seen.name === f.name)) flows.push(f);
	}
	return { flows, errors: [...local.errors, ...home.errors] };
}
