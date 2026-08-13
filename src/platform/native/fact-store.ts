/**
 * The fact store behind the native seam — with the DEFAULT REVERSED. Every
 * other stage serves the Rust implementation whenever the prebuilt exists;
 * this one keeps the TypeScript reference as the default and serves Rust
 * only under an explicit FLUSK_NATIVE=1, because the store is the one place
 * a behavioral difference corrupts durable state instead of a search result.
 * Per the migration plan, the native path stays opt-in until the durability
 * harness (test/native-store-durability.test.ts) has proven byte-level
 * equivalence. FLUSK_NATIVE=0 still means TypeScript, and a missing or
 * broken binary degrades to TypeScript silently.
 *
 * The namespace→path convention and the clock stay on this side of the seam
 * for BOTH implementations, so a mixed fleet spells log paths — and the
 * `.lock` files that guard them — one single way.
 */
import { compareFailed } from "../../features/facts/errors.js";
import {
	createFactStore,
	type FactStoreOptions,
} from "../../features/facts/facts.repository.js";
import { nsPath, storeDir } from "../../features/facts/paths.js";
import { sweepTransient } from "../../features/facts/sweep.js";
import type { Compare, Fact, FactStore, TransactResult } from "../../features/facts/types.js";
import { nativeModule } from "./native.repository.js";

interface NativeFactStore {
	query(path: string, paramsJson: string, nowMs: number): Promise<string>;
	transact(path: string, assertsJson: string, comparesJson: string, nowMs: number): Promise<string>;
	sweep(path: string, atMs: number): Promise<string>;
}

interface StoreNativeModule {
	createFactStore(): NativeFactStore;
}

export interface SeamFactStore extends FactStore {
	/** Which implementation is answering — surfaced in logs and tests only. */
	readonly impl: "native" | "ts";
	/** Hard-deletes expired transient rows from `ns`; returns how many went. */
	sweepTransient(ns: string, at?: number): Promise<number>;
}

/** Opt-in, not opt-out: native only when the user explicitly asked for it. */
const nativeStoreModule = (): StoreNativeModule | null => {
	if (process.env.FLUSK_NATIVE !== "1") return null;
	const mod = nativeModule() as unknown as Partial<StoreNativeModule> | null;
	// An older prebuilt without the store bindings degrades like a missing one.
	return mod !== null && typeof mod.createFactStore === "function"
		? (mod as StoreNativeModule)
		: null;
};

export function openFactStore(options: FactStoreOptions = {}): SeamFactStore {
	const dir = options.dir ?? storeDir();
	const now = options.now ?? Date.now;
	const native = nativeStoreModule();
	if (native === null) return tsStore(options, dir, now);
	try {
		const engine = native.createFactStore();
		return {
			impl: "native",
			query: async (ns, params) =>
				JSON.parse(await engine.query(nsPath(dir, ns), JSON.stringify(params), now())) as Fact[],
			transact: async (ns, asserts, compares = []) => {
				const raw = await engine.transact(
					nsPath(dir, ns),
					JSON.stringify(asserts),
					JSON.stringify(compares),
					now(),
				);
				const out = JSON.parse(raw) as Partial<TransactResult> & { compareFailed?: Compare[] };
				// A lost race travels as data so it can be rethrown as the exact
				// typed rejection callers switch on — not a generic native error.
				if (out.compareFailed !== undefined) throw compareFailed(out.compareFailed);
				return { tx: out.tx ?? 0, ids: out.ids ?? [] };
			},
			sweepTransient: async (ns, at = now()) =>
				Number(await engine.sweep(nsPath(dir, ns), at)),
		};
	} catch {
		// Never let a native failure take the store down: the reference answers.
		return tsStore(options, dir, now);
	}
}

function tsStore(
	options: FactStoreOptions,
	dir: string,
	now: () => number,
): SeamFactStore {
	const store = createFactStore(options);
	return {
		impl: "ts",
		query: (ns, params) => store.query(ns, params),
		transact: (ns, asserts, compares) => store.transact(ns, asserts, compares),
		sweepTransient: (ns, at = now()) => sweepTransient(ns, at, dir),
	};
}
