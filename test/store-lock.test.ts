/**
 * The lock's one documented compromise is that an aged-out lock may be stolen.
 * Everything else about it has to hold, and the property pinned here is the
 * one that turns that compromise into an unbounded hole: a holder whose lock
 * was stolen must not delete the thief's lock on the way out, or the critical
 * section stands open for the whole remainder of the thief's work and a third
 * writer walks straight in.
 */
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { withLock } from "../src/store/lock.js";

let dir: string;
let path: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "ah-lock-"));
	path = join(dir, "ns.jsonl");
	await writeFile(path, "");
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

const lockPath = (): string => `${path}.lock`;

/** Backdates the lock past STALE_MS without waiting ten seconds for it. */
async function age(): Promise<void> {
	const old = new Date(Date.now() - 60_000);
	await utimes(lockPath(), old, old);
}

it("a holder whose lock was stolen leaves the thief's lock alone", async () => {
	const thief = "999:thief";
	await withLock(path, async () => {
		// Work that outran STALE_MS: a second process takes the lock over,
		// which is what acquire() is documented to do to a stale one.
		await age();
		await rm(lockPath());
		await writeFile(lockPath(), thief);
	});
	// The overrun holder released into a path it no longer owned. Deleting what
	// it found there would admit a third writer while the thief is mid-append.
	expect(await readFile(lockPath(), "utf8")).toBe(thief);
});

it("an abandoned lock is still stolen, and a clean release frees the path", async () => {
	await writeFile(lockPath(), "1:killed-process");
	await age();
	let entered = false;
	await withLock(path, async () => {
		entered = true;
	});
	expect(entered).toBe(true);
	await expect(stat(lockPath())).rejects.toThrow();
});

it("a fresh lock is never stolen: the two writers never overlap", async () => {
	let inside = 0;
	let most = 0;
	const enter = async (ms: number): Promise<void> =>
		withLock(path, async () => {
			inside++;
			most = Math.max(most, inside);
			await new Promise((r) => setTimeout(r, ms));
			inside--;
		});
	await Promise.all([enter(60), enter(60), enter(10)]);
	expect(most).toBe(1);
});
