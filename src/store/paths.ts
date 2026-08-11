/**
 * Where a namespace's log lives on disk.
 *
 * Namespaces are caller-supplied strings ("ah", "repo:ah-1a2b3c4d") and
 * are never safe to use as a filename directly: a slash would write outside
 * the store, and two namespaces that differ only in punctuation would share a
 * log and silently merge two tenants' facts. The name is therefore a readable
 * slug plus a hash of the exact namespace, mirroring the session-store
 * convention in src/session/paths.ts so there is one way to name state here.
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ahHome } from "../session/paths.js";

/** Root of the fact store: one append-only JSONL log per namespace. */
export function storeDir(): string {
	return join(ahHome(), "store");
}

/** Collision-safe log filename for `ns`. */
export function nsFile(ns: string): string {
	const slug =
		ns
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "ns";
	const hash = createHash("sha256").update(ns).digest("hex").slice(0, 8);
	return `${slug}-${hash}.jsonl`;
}

export function nsPath(dir: string, ns: string): string {
	return join(dir, nsFile(ns));
}
