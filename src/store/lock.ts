/**
 * An advisory lock file around the read-modify-append of a transact.
 *
 * Task claiming is safe across sessions only if two processes cannot read the
 * same state and both act on it: without this, each would evaluate its guard
 * against a log neither had written to yet, both would see {status pending},
 * and both would start the same task. The in-process queue cannot help — the
 * competing writer is another `ah` run entirely.
 *
 * A lock is stolen once it is older than STALE_MS, because the alternative to
 * a rare double-claim is a store wedged forever by one killed process. That
 * trade is bounded ONLY while every removal is a compare-and-delete: the lock
 * file carries the token of whoever created it, and a holder whose lock was
 * stolen must not delete the thief's lock on the way out. An unconditional
 * unlink leaves the critical section unguarded for the whole remainder of the
 * next holder's work, which is worse than the race the steal was avoiding.
 */
import { randomUUID } from "node:crypto";
import { open, readFile, stat, unlink } from "node:fs/promises";

const STALE_MS = 10_000;
const WAIT_MS = 15_000;
const RETRY_MS = 20;

export async function withLock<T>(path: string, work: () => Promise<T>): Promise<T> {
	const lock = `${path}.lock`;
	const token = await acquire(lock);
	try {
		return await work();
	} finally {
		await release(lock, token);
	}
}

/** Creates the lock and returns the token that identifies this holder. */
async function acquire(lock: string): Promise<string> {
	const deadline = Date.now() + WAIT_MS;
	for (;;) {
		const token = `${process.pid}:${randomUUID()}`;
		try {
			const handle = await open(lock, "wx");
			try {
				await handle.writeFile(token, "utf8");
			} finally {
				await handle.close();
			}
			return token;
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
		}
		await stealIfStale(lock);
		if (Date.now() > deadline) throw new Error(`store: timed out waiting for ${lock}`);
		await new Promise((r) => setTimeout(r, RETRY_MS));
	}
}

/**
 * Remove the lock only while it is still the one this call created. A holder
 * that overran STALE_MS no longer owns the path, and deleting what it finds
 * there would hand the store to a third writer while the second is mid-append.
 */
async function release(lock: string, token: string): Promise<void> {
	if ((await tokenOf(lock)) !== token) return;
	await unlink(lock).catch(() => undefined);
}

/**
 * Steal an aged-out lock, but only if the token has not changed since it was
 * read: the holder may have released between the read and the unlink, and the
 * lock now on disk would then belong to a writer that is not stale at all.
 */
async function stealIfStale(lock: string): Promise<void> {
	const token = await tokenOf(lock);
	if (token === null) return;
	let mtimeMs: number;
	try {
		mtimeMs = (await stat(lock)).mtimeMs;
	} catch {
		return;
	}
	if (Date.now() - mtimeMs <= STALE_MS) return;
	if ((await tokenOf(lock)) !== token) return;
	await unlink(lock).catch(() => undefined);
}

/** The holder's token, or null when the path is free. */
async function tokenOf(lock: string): Promise<string | null> {
	try {
		return await readFile(lock, "utf8");
	} catch {
		return null;
	}
}
