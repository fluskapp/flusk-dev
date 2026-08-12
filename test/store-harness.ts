import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nsPath } from "../src/features/facts/paths.js";
import { createFactStore } from "../src/features/facts/facts.repository.js";
import type { FactStore } from "../src/features/facts/types.js";

export const HOUR = 3_600_000;

/** Real wall-clock now, which is what a query with no `asOf` reads against. */
export const NOW = Date.now();

/**
 * The fixture clock, a day behind real time: a bare query is the live-now
 * snapshot, so facts stamped in the future would be invisible for reasons the
 * test never intended. Tests move forward from here in seconds and hours and
 * still stay in the past.
 */
export const T0 = NOW - 24 * HOUR;

export const NS = "repo:demo-1a2b3c4d";

export function iso(ms: number): string {
	return new Date(ms).toISOString();
}

export interface Harness {
	store: FactStore;
	dir: string;
	/** Moves the store's clock; every later transact stamps from here. */
	at(ms: number): void;
	/** A second store over the same logs, as a concurrent session would be. */
	rival(): FactStore;
	logPath(ns: string): string;
	cleanup(): Promise<void>;
}

/** Real temp directory, real files: this is the storage layer under test. */
export async function harness(): Promise<Harness> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-store-"));
	let clock = T0;
	const now = () => clock;
	return {
		store: createFactStore({ dir, now }),
		dir,
		at: (ms) => {
			clock = ms;
		},
		rival: () => createFactStore({ dir, now }),
		logPath: (ns) => nsPath(dir, ns),
		cleanup: () => rm(dir, { recursive: true, force: true }),
	};
}
