/**
 * The release gate for the store port: both implementations run the SAME
 * generated operation sequences — interleaved asserts, supersessions, TTL
 * expiry, CAS conflicts, sweeps, and crashes simulated by truncating the log
 * at a byte boundary — over real files, and must agree twice over: the log
 * files byte-identical (ids mapped to first-appearance ordinals; both sides
 * mint random UUIDs of equal width) and every query equal at multiple asOf
 * points. Skips when the prebuilt is absent rather than lies.
 */
import { readFile, truncate } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CompareFailedError, QueryParams } from "../src/features/facts/types.js";
import type { SeamFactStore } from "../src/platform/native/fact-store.js";
import { nativeModule } from "../src/platform/native/native.repository.js";
import {
	canonicalIds, genOps, HOUR, idMap, iso, mulberry32, NO_LIMIT, NS, type Op, OTHER_NS, T0,
} from "./native-store-fixtures.js";
import { storePair, type StorePair } from "./native-store-pair.js";

const describeNative = nativeModule() === null ? describe.skip : describe;

interface Outcome {
	ok: boolean;
	tx?: number;
	ids?: string[];
	code?: string;
	failures?: unknown;
}

async function run(store: SeamFactStore, op: Op, clock: number): Promise<Outcome> {
	try {
		switch (op.kind) {
			case "assert": {
				const r = await store.transact(op.ns, [op.input]);
				return { ok: true, tx: r.tx, ids: r.ids };
			}
			case "cas": {
				const r = await store.transact(op.ns, [op.input], [op.compare]);
				return { ok: true, tx: r.tx, ids: r.ids };
			}
			case "ttl": {
				const until = iso(clock + op.hours * HOUR);
				const input = { subject: op.subject, predicate: "cooldown", object: until };
				const r = await store.transact(NS, [{ ...input, transient: true, validUntil: until }]);
				return { ok: true, tx: r.tx, ids: r.ids };
			}
			case "sweep":
				return { ok: true, tx: await store.sweepTransient(NS) };
			default:
				return { ok: true };
		}
	} catch (e) {
		const err = e as CompareFailedError;
		return { ok: false, code: err.code, failures: err.failures };
	}
}

const readText = (path: string): Promise<string> => readFile(path, "utf8").catch(() => "");

const mapped = (ids: string[], map: Map<string, string>): string[] =>
	ids.map((id) => map.get(id) ?? id);

async function logsAgree(pair: StorePair, ns: string): Promise<void> {
	const [ts, rs] = await Promise.all([readText(pair.tsPath(ns)), readText(pair.rsPath(ns))]);
	expect(canonicalIds(rs), `log for ${ns}`).toBe(canonicalIds(ts));
}

async function queriesAgree(pair: StorePair, ns: string, asOfs: (number | string)[]): Promise<void> {
	const tsMap = idMap(await readText(pair.tsPath(ns)));
	const rsMap = idMap(await readText(pair.rsPath(ns)));
	const statuses = [undefined, "active,candidate,superseded", "superseded", "candidate"];
	for (const asOf of asOfs) {
		for (const status of statuses) {
			for (const limit of [3, NO_LIMIT]) {
				const params: QueryParams = { asOf, limit, ...(status !== undefined ? { status } : {}) };
				const [ts, rs] = await Promise.all([pair.ts.query(ns, params), pair.rs.query(ns, params)]);
				const label = `query ${ns} asOf=${asOf} status=${status} limit=${limit}`;
				expect(rs.map((f) => ({ ...f, id: rsMap.get(f.id) ?? f.id })), label).toEqual(
					ts.map((f) => ({ ...f, id: tsMap.get(f.id) ?? f.id })),
				);
			}
		}
	}
}

describeNative("native store durability ≡ TypeScript reference", () => {
	it("is actually the native implementation under test", async () => {
		const pair = await storePair();
		expect(pair.ts.impl).toBe("ts");
		expect(pair.rs.impl).toBe("native");
		await pair.cleanup();
	});

	it("agrees byte-for-byte across generated interleavings, tears included", async () => {
		for (const seed of [11, 23, 47]) {
			const pair = await storePair();
			const rand = mulberry32(seed);
			let clock = T0;
			for (const op of genOps(rand, 60)) {
				if (op.kind === "advance") {
					clock += op.ms;
					pair.at(clock);
					continue;
				}
				if (op.kind === "tear") {
					// The same crash, byte for byte: id widths are equal, so the
					// two logs are the same length and one offset tears both at
					// the same point in the same record.
					const [ts, rs] = await Promise.all([readText(pair.tsPath(NS)), readText(pair.rsPath(NS))]);
					expect(Buffer.byteLength(rs)).toBe(Buffer.byteLength(ts));
					const cut = Math.floor(op.frac * (Buffer.byteLength(ts) + 1));
					await truncate(pair.tsPath(NS), cut).catch(() => undefined);
					await truncate(pair.rsPath(NS), cut).catch(() => undefined);
					pair.reopen();
					await logsAgree(pair, NS);
					continue;
				}
				const tsOut = await run(pair.ts, op, clock);
				const rsOut = await run(pair.rs, op, clock);
				const tsMap = idMap(await readText(pair.tsPath(NS)) + (await readText(pair.tsPath(OTHER_NS))));
				const rsMap = idMap(await readText(pair.rsPath(NS)) + (await readText(pair.rsPath(OTHER_NS))));
				expect(
					{ ...rsOut, ids: mapped(rsOut.ids ?? [], rsMap) },
					`outcome of ${JSON.stringify(op)}`,
				).toEqual({ ...tsOut, ids: mapped(tsOut.ids ?? [], tsMap) });
				await logsAgree(pair, NS);
				await logsAgree(pair, OTHER_NS);
			}
			const asOfs = [T0 - 1, iso(T0 + HOUR / 2), T0 + 6 * HOUR, pair.now()];
			await queriesAgree(pair, NS, asOfs);
			await queriesAgree(pair, OTHER_NS, asOfs);
			await pair.cleanup();
		}
	}, 120_000);
});
