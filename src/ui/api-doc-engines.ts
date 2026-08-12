/**
 * Which documentation engine answers for a file, and who owns its lifetime.
 *
 * A registry is expensive in a way a Map does not advertise: it holds a warm
 * TypeScript program and, for a configured `doc.servers` entry, a SPAWNED
 * CHILD PROCESS. An unbounded map of them meant every project root that ever
 * received one lookup kept its language servers alive for the life of
 * `flusk ui`, and nothing ever called `dispose()` — not even on shutdown, so the
 * SIGKILL that reaches the process groups was never sent. So the map is a
 * small LRU that disposes what it evicts, and the server closes it with the
 * rest of its resources.
 *
 * Split from api-doc.ts, which owns the routes.
 */
import type { FluskConfig } from "../config/types.js";
import { createDocRegistry, type DocChoice, type DocRegistry } from "../doc/registry.js";
import { searchRoots } from "../find/files.js";

/** Two open projects is the workflow; a third evicts (and disposes) the first. */
const MAX_REGISTRIES = 2;

/** Insertion-ordered: the first key is the least recently used root. */
const registries = new Map<string, DocRegistry>();

/** The engine for an indexed file, or the sentence explaining the refusal. */
export async function engineFor(cfg: FluskConfig, file: string): Promise<DocChoice> {
	const root = searchRoots(cfg).find((r) => file.startsWith(`${r.path}/`))?.path;
	if (root === undefined) return { provider: null, reason: "not inside a configured project" };
	const cached = registries.get(root);
	const registry = cached ?? createDocRegistry(cfg, root);
	registries.delete(root);
	registries.set(root, registry); // touched: the LRU order is use order
	while (registries.size > MAX_REGISTRIES) {
		const oldest = registries.keys().next();
		if (oldest.done === true) break;
		registries.get(oldest.value)?.dispose();
		registries.delete(oldest.value);
	}
	return registry.for(file);
}

/**
 * Drops every registry and the processes behind it. The server calls this on
 * close: a language server flusk spawned must not outlive the dashboard, and its
 * stdio pipes must not be what keeps `flusk ui` from exiting.
 */
export function disposeDocRegistries(): void {
	for (const registry of registries.values()) registry.dispose();
	registries.clear();
}
