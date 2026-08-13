/**
 * Lock interop: a mixed fleet appends to the same logs, so BOTH
 * implementations must contend on the same `<log>.lock` file. A fresh
 * foreign lock must make either writer wait; a stale one (mtime past the
 * 10s window) must be stolen rather than wedge the store forever.
 */
import { readFile, unlink, utimes, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { nativeModule } from "../src/platform/native/native.repository.js";
import { NS } from "./native-store-fixtures.js";
import { storePair } from "./native-store-pair.js";

const describeNative = nativeModule() === null ? describe.skip : describe;

const HOLD_MS = 300;

describeNative("both implementations honor the same lock file", () => {
	it("a fresh foreign lock makes the native writer wait for release", async () => {
		const pair = await storePair();
		const lock = `${pair.rsPath(NS)}.lock`;
		await writeFile(lock, "99999:someone-elses-token", "utf8");
		const started = Date.now();
		const release = setTimeout(() => void unlink(lock).catch(() => undefined), HOLD_MS);
		try {
			await pair.rs.transact(NS, [{ subject: "S", predicate: "p", object: "o" }]);
		} finally {
			clearTimeout(release);
		}
		// It cannot have written while the lock was held: 15s timeout is the
		// only other way past, and we finished far sooner than that.
		expect(Date.now() - started).toBeGreaterThanOrEqual(HOLD_MS - 20);
		expect(await readFile(pair.rsPath(NS), "utf8")).toContain('"subject":"S"');
		await pair.cleanup();
	}, 20_000);

	it("a fresh native-convention lock makes the TS writer wait for release", async () => {
		const pair = await storePair();
		const lock = `${pair.tsPath(NS)}.lock`;
		// The token shape the Rust side writes: pid:uuid, no trailing newline.
		await writeFile(lock, "88888:00000000-0000-4000-8000-000000000001", "utf8");
		const started = Date.now();
		const release = setTimeout(() => void unlink(lock).catch(() => undefined), HOLD_MS);
		try {
			await pair.ts.transact(NS, [{ subject: "S", predicate: "p", object: "o" }]);
		} finally {
			clearTimeout(release);
		}
		expect(Date.now() - started).toBeGreaterThanOrEqual(HOLD_MS - 20);
		await pair.cleanup();
	}, 20_000);

	it("a stale foreign lock is stolen, not waited out", async () => {
		const pair = await storePair();
		const lock = `${pair.rsPath(NS)}.lock`;
		await writeFile(lock, "99999:crashed-holders-token", "utf8");
		const stale = (Date.now() - 20_000) / 1000;
		await utimes(lock, stale, stale);
		const started = Date.now();
		await pair.rs.transact(NS, [{ subject: "S", predicate: "p", object: "o" }]);
		// Well under the 15s wait: the steal happened on the first retry.
		expect(Date.now() - started).toBeLessThan(5_000);
		// And the compare-and-delete released OUR lock on the way out; the
		// crashed holder's token must not have come back.
		await expect(readFile(lock, "utf8")).rejects.toThrow();
		await pair.cleanup();
	}, 20_000);
});
