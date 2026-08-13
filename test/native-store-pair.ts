/**
 * The paired stores the durability harness drives: TypeScript reference and
 * Rust, over separate dirs, sharing ONE logical clock so every timestamp
 * lands identically. The native side is created under a scoped FLUSK_NATIVE=1
 * (the stage-4 opt-in); the TS side under the default, which doubles as a
 * standing check that the default IS the reference.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nsPath } from "../src/features/facts/paths.js";
import { openFactStore, type SeamFactStore } from "../src/platform/native/fact-store.js";
import { T0 } from "./native-store-fixtures.js";

export interface StorePair {
	ts: SeamFactStore;
	rs: SeamFactStore;
	tsPath(ns: string): string;
	rsPath(ns: string): string;
	at(ms: number): void;
	now(): number;
	/** Fresh store instances over the same logs — the post-crash reopen. */
	reopen(): void;
	cleanup(): Promise<void>;
}

export async function storePair(): Promise<StorePair> {
	const tsDir = await mkdtemp(join(tmpdir(), "flusk-store-ts-"));
	const rsDir = await mkdtemp(join(tmpdir(), "flusk-store-rs-"));
	let clock = T0;
	const now = () => clock;
	const open = (): { ts: SeamFactStore; rs: SeamFactStore } => {
		const ts = openFactStore({ dir: tsDir, now });
		process.env.FLUSK_NATIVE = "1";
		try {
			return { ts, rs: openFactStore({ dir: rsDir, now }) };
		} finally {
			delete process.env.FLUSK_NATIVE;
		}
	};
	const pair = {
		...open(),
		tsPath: (ns: string) => nsPath(tsDir, ns),
		rsPath: (ns: string) => nsPath(rsDir, ns),
		at: (ms: number) => {
			clock = ms;
		},
		now,
		reopen: () => {
			const fresh = open();
			pair.ts = fresh.ts;
			pair.rs = fresh.rs;
		},
		cleanup: async () => {
			await rm(tsDir, { recursive: true, force: true });
			await rm(rsDir, { recursive: true, force: true });
		},
	};
	return pair;
}
