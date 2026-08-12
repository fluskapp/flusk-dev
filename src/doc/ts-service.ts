/**
 * TypeScript LanguageServices, held on a leash.
 *
 * A language service is the most expensive thing in flusk: seconds to warm and
 * hundreds of megabytes, all inside the event loop. Every cost here is
 * bounded and *reportable* rather than merely hoped for:
 *
 *  - A SMALL LRU keyed by root, two services by default. One was cheaper in
 *    memory and ruinous in practice: alternating clicks between two projects
 *    rebuilt a whole program per click. `maxServices: 1` restores the old cap.
 *  - A project over `fileCap` files is REFUSED with a reason — and the cap is
 *    re-checked AFTER tsconfig resolution, because `include` can name far more
 *    files than the directory scan ever saw.
 *  - Builds are SERIALISED per root. The identity check used to run before
 *    `await loadTypeScript()`, so two overlapping lookups for different roots
 *    both proceeded and the loser got an already-disposed service whose every
 *    call answered null — a silent "no symbol at this position".
 *  - `serviceStatus()` is observable: a caller can say "indexing…" instead of
 *    hanging, because the first call is the one that builds the program.
 */
import { resolve } from "node:path";
import { type DocService, makeService } from "./ts-host.js";
import { loadTypeScript } from "./ts-load.js";
import { DEFAULT_FILE_CAP, projectConfig, scanProject } from "./ts-project.js";

export type { DocService } from "./ts-host.js";
export { loadTypeScript } from "./ts-load.js";
export type ServiceState = "absent" | "refused" | "indexing" | "ready";

/** Two open projects is the workflow; a third evicts the least recent. */
const DEFAULT_MAX_SERVICES = 2;
/** A program build cannot be interrupted, so its budget is generous. */
const DEFAULT_WARMUP_MS = 60_000;

export interface ServiceStatus {
	state: ServiceState;
	root: string | null;
	files: number;
	/** Present whenever `state` is "absent" or "refused". */
	reason?: string;
}

export interface ServiceOptions {
	fileCap?: number;
	timeoutMs?: number;
	warmupMs?: number;
	maxServices?: number;
}

const IDLE: ServiceStatus = { state: "absent", root: null, files: 0, reason: "no project opened" };

/** Insertion-ordered: the first key is the least recently used root. */
const live = new Map<string, DocService>();
const building = new Map<string, Promise<DocService | null>>();
let status: ServiceStatus = IDLE;

export function serviceStatus(): ServiceStatus {
	return { ...status };
}

function evict(limit: number): void {
	while (live.size > Math.max(1, limit)) {
		const oldest = live.keys().next();
		if (oldest.done === true) return;
		live.get(oldest.value)?.dispose();
		live.delete(oldest.value);
	}
}

const refuse = (root: string, files: number, reason: string): null => {
	status = { state: "refused", root, files, reason };
	return null;
};

async function build(dir: string, opts: ServiceOptions): Promise<DocService | null> {
	const ts = await loadTypeScript();
	if (ts === null) {
		status = { state: "absent", root: dir, files: 0, reason: "typescript is not installed" };
		return null;
	}
	// Re-checked after the await: another caller may have finished in between.
	const raced = live.get(dir);
	if (raced !== undefined) return raced;
	const cap = opts.fileCap ?? DEFAULT_FILE_CAP;
	const over = `project has more than ${cap} source files — too large to index`;
	const scan = scanProject(dir, cap);
	if (scan.overCap) return refuse(dir, scan.files.length, over);
	// The cap the scan enforced is not the one that matters: tsconfig's include
	// reaches past the scan's dist and .d.ts skips, so the INDEXED count refuses.
	const cfg = projectConfig(ts, dir, scan);
	const files = cfg.files.length;
	if (files > cap) return refuse(dir, files, over);
	// The state callback checks identity: an evicted service that is still held
	// by an old caller must not overwrite the status of the live one.
	let made: DocService | null = null;
	const timeoutMs = opts.timeoutMs ?? 10_000;
	const limits = { timeoutMs, warmupMs: opts.warmupMs ?? DEFAULT_WARMUP_MS };
	made = makeService(ts, dir, cfg, limits, (state, reason) => {
		if (live.get(dir) === made) {
			status = { state, root: dir, files, ...(reason === undefined ? {} : { reason }) };
		}
	});
	live.set(dir, made);
	evict(opts.maxServices ?? DEFAULT_MAX_SERVICES);
	status = { state: "indexing", root: dir, files };
	return made;
}

/**
 * The service for `root`, creating it if needed and evicting the least recent
 * past the limit. Null when typescript is absent or the project is over the
 * cap; `serviceStatus()` then carries the reason to show.
 */
export async function getService(
	root: string,
	opts: ServiceOptions = {},
): Promise<DocService | null> {
	const dir = resolve(root);
	const hit = live.get(dir);
	if (hit !== undefined) {
		live.delete(dir);
		live.set(dir, hit); // touched: the LRU order is use order
		return hit;
	}
	const running = building.get(dir);
	if (running !== undefined) return running;
	const started = build(dir, opts).finally(() => building.delete(dir));
	building.set(dir, started);
	return started;
}

/** Drops every live service (and its program) and resets the reported status. */
export function disposeService(): void {
	for (const service of live.values()) service.dispose();
	live.clear();
	status = IDLE;
}

/**
 * Drops the service for `root` only: closing an old doc view must not kill the
 * service the LRU has since built for whatever project is open now.
 */
export function releaseRoot(root: string): void {
	const dir = resolve(root);
	const service = live.get(dir);
	if (service === undefined) return;
	service.dispose();
	live.delete(dir);
	if (status.root === dir) status = IDLE;
}
