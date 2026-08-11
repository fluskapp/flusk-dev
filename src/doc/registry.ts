/**
 * Which engine answers for a file — and, when none can, WHY.
 *
 * The reason is the point. A doc panel that renders empty for a .rs file is
 * indistinguishable from a broken one; "no language server is configured for
 * .rs" tells the user the one thing they can act on. So the choice type
 * carries a sentence for every refusal, and no caller has to invent one.
 *
 * Order: TypeScript and JavaScript go to the bundled compiler-API engine,
 * which needs nothing installed. Everything else needs an entry under
 * `doc.servers` AND that binary on PATH — ah spawns nothing the user did not
 * name. If TypeScript itself is missing, a configured server for .ts is used
 * rather than refusing, since by then the user has clearly opted in.
 *
 * Providers are cached per id: the whole reason a language server is bearable
 * is that you pay for its index once, not once per lookup.
 */
import { accessSync, constants } from "node:fs";
import { delimiter, extname, isAbsolute, join } from "node:path";
import type { AhConfig, DocServerConfig } from "../config/types.js";
import { withDocCache } from "./cache.js";
import { createLspProvider, type LspDocProvider } from "./lsp-provider.js";
import { createTsProvider } from "./ts-provider.js";
import type { DocProvider } from "./types.js";

/** Kept in step with EXTENSIONS in ts-provider.ts, which owns the engine. */
const TS_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);

export interface DocChoice {
	provider: DocProvider | null;
	/** Present exactly when `provider` is null. */
	reason?: string;
}

export interface DocRegistry {
	/** The engine for `file`, or null and a sentence explaining the refusal. */
	for(file: string): Promise<DocChoice>;
	dispose(): void;
}

/** The command as an executable path, or null when it is not on PATH. */
export function resolveBinary(command: string, env = process.env): string | null {
	const executable = (path: string): boolean => {
		try {
			accessSync(path, constants.X_OK);
			return true;
		} catch {
			return false;
		}
	};
	if (command.includes("/") || isAbsolute(command)) return executable(command) ? command : null;
	for (const dir of (env["PATH"] ?? "").split(delimiter)) {
		if (dir === "") continue;
		const candidate = join(dir, command);
		if (executable(candidate)) return candidate;
	}
	return null;
}

function serverFor(servers: DocServerConfig[], ext: string): DocServerConfig | undefined {
	return servers.find((s) => s.extensions.some((e) => e.toLowerCase() === ext));
}

export function createDocRegistry(cfg: AhConfig, root: string): DocRegistry {
	const doc = cfg.doc;
	const lsp = new Map<string, LspDocProvider>();
	let ts: Promise<DocChoice> | null = null;

	/** Memoised: the TypeScript engine is built once per registry, or never. */
	const tsChoice = (): Promise<DocChoice> => {
		ts ??= createTsProvider(root).then((r) =>
			r.ok ? { provider: r.provider } : { provider: null, reason: r.reason },
		);
		return ts;
	};

	const lspChoice = (server: DocServerConfig, ext: string): DocChoice => {
		const cached = lsp.get(server.id);
		if (cached !== undefined) {
			// A server that died is not respawned: one corpse per session, and
			// the panel says so instead of silently answering nothing.
			if (!cached.available()) {
				return { provider: null, reason: `the ${server.id} language server stopped responding` };
			}
			return { provider: cached };
		}
		if (resolveBinary(server.command) === null) {
			return {
				provider: null,
				reason: `${server.id} is configured for ${ext} but "${server.command}" is not on PATH`,
			};
		}
		const live = createLspProvider({
			id: server.id,
			command: server.command,
			args: server.args ?? [],
			extensions: server.extensions,
			root,
			cwd: root,
			maxFiles: doc.maxFiles,
		});
		// Memoised per file version, like the TypeScript engine: a language server
		// round trip is the cheap half of a lookup, and `relatedFor` behind it is
		// not. `available()` stays the LIVE client's, never a cached answer.
		const provider: LspDocProvider = { ...withDocCache(live), available: () => live.available() };
		lsp.set(server.id, provider);
		return { provider };
	};

	return {
		async for(file: string): Promise<DocChoice> {
			if (!doc.enabled)
				return { provider: null, reason: "documentation lookup is off (doc.enabled)" };
			const ext = extname(file).toLowerCase();
			if (ext === "")
				return { provider: null, reason: "no engine handles files with no extension" };
			const server = serverFor(doc.servers, ext);
			if (TS_EXTENSIONS.has(ext)) {
				const choice = await tsChoice();
				// TypeScript absent but a server configured for .ts: use it.
				if (choice.provider !== null || server === undefined) return choice;
			}
			if (server === undefined) {
				return {
					provider: null,
					reason: `no language server is configured for ${ext} — add one under doc.servers`,
				};
			}
			return lspChoice(server, ext);
		},
		dispose(): void {
			for (const provider of lsp.values()) provider.dispose();
			lsp.clear();
			void ts?.then((c) => c.provider?.dispose());
		},
	};
}
