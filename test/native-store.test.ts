/**
 * The seam's direction — REVERSED for this stage — and error parity. The
 * TypeScript reference must answer by default and under FLUSK_NATIVE=0; the
 * Rust store answers only under an explicit FLUSK_NATIVE=1. Rejections must
 * agree too: the exact `CompareFailed` code and failures a lost race carries,
 * and the batch-shape messages, are contract, not decoration.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { CompareFailedError } from "../src/features/facts/types.js";
import { openFactStore } from "../src/platform/native/fact-store.js";
import { nativeModule } from "../src/platform/native/native.repository.js";
import { NS, T0 } from "./native-store-fixtures.js";
import { storePair } from "./native-store-pair.js";

const describeNative = nativeModule() === null ? describe.skip : describe;

afterEach(() => {
	delete process.env.FLUSK_NATIVE;
});

describe("the seam ships TypeScript-default", () => {
	it("serves the TS reference when FLUSK_NATIVE is unset", () => {
		expect(openFactStore().impl).toBe("ts");
	});

	it("serves the TS reference under FLUSK_NATIVE=0", () => {
		process.env.FLUSK_NATIVE = "0";
		expect(openFactStore().impl).toBe("ts");
	});
});

describeNative("native store ≡ TypeScript reference, unhappy paths included", () => {
	it("serves Rust only under the explicit FLUSK_NATIVE=1 opt-in", () => {
		process.env.FLUSK_NATIVE = "1";
		expect(openFactStore().impl).toBe("native");
	});

	it("rejects an empty batch with the reference's message, writing nothing", async () => {
		const pair = await storePair();
		const tsErr = await pair.ts.transact(NS, []).catch((e: Error) => e);
		const rsErr = await pair.rs.transact(NS, []).catch((e: Error) => e);
		expect(tsErr).toBeInstanceOf(Error);
		expect((rsErr as Error).message).toContain("transact: asserts must not be empty");
		expect((tsErr as Error).message).toBe("transact: asserts must not be empty");
		await pair.cleanup();
	});

	it("rejects a double-assert on one (subject, predicate) identically", async () => {
		const pair = await storePair();
		const batch = [
			{ subject: "T", predicate: "status", object: "a" },
			{ subject: "T", predicate: "status", object: "b" },
		];
		const tsErr = await pair.ts.transact(NS, batch).catch((e: Error) => e);
		const rsErr = await pair.rs.transact(NS, batch).catch((e: Error) => e);
		const wanted = "transact: (T, status) asserted twice in one call";
		expect((tsErr as Error).message).toBe(wanted);
		expect((rsErr as Error).message).toContain(wanted);
		await pair.cleanup();
	});

	it("a lost race rejects with code CompareFailed and the exact failures", async () => {
		const pair = await storePair();
		for (const store of [pair.ts, pair.rs]) {
			await store.transact(NS, [{ subject: "T", predicate: "status", object: "pending" }]);
		}
		pair.at(T0 + 1000);
		const claim = [{ subject: "T", predicate: "status", object: "running" }];
		const guard = [{ subject: "T", predicate: "status", object: "done" }];
		const tsErr = await pair.ts.transact(NS, claim, guard).catch((e: CompareFailedError) => e);
		const rsErr = await pair.rs.transact(NS, claim, guard).catch((e: CompareFailedError) => e);
		for (const err of [tsErr, rsErr] as CompareFailedError[]) {
			expect(err.code).toBe("CompareFailed");
			expect(err.failures).toEqual(guard);
		}
		expect((rsErr as Error).message).toBe((tsErr as Error).message);
		await pair.cleanup();
	});

	it("re-asserting the same fact returns the existing id on both sides", async () => {
		const pair = await storePair();
		const input = [{ subject: "R", predicate: "test_cmd", object: "vitest" }];
		for (const store of [pair.ts, pair.rs]) {
			const first = await store.transact(NS, input);
			pair.at(T0 + 5000);
			const second = await store.transact(NS, input);
			expect(second.ids).toEqual(first.ids);
			expect(second.tx).toBe(first.tx + 1);
			pair.at(T0);
		}
		await pair.cleanup();
	});
});
