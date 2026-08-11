/**
 * A DocProvider backed by any language server, so the doc view is not
 * TypeScript-only: configure `doc.servers` and .rs, .py and .go answer with
 * the same SymbolDoc the TypeScript engine produces.
 *
 * Lifecycle is lazy and one-shot: nothing spawns until the first lookup, and
 * the handshake is remembered as a PROMISE including its failure, so a server
 * that is absent or dead costs one spawn per ah process, not one per keystroke.
 * Documents are opened, not sent, and KEPT IN STEP with the disk — lsp-docs.ts
 * owns that, because a server answering from a stale buffer is the one failure
 * mode that looks like a correct answer.
 */
import { extname } from "node:path";
import { type LspClient, type LspServerSpec, startLsp } from "./lsp-client.js";
import { fileToUri, kindAt, toLocs, toOutline } from "./lsp-convert.js";
import { createOpenDocs } from "./lsp-docs.js";
import { parseHover, wordAt } from "./lsp-hover.js";
import type { DocProvider, OutlineItem, SymbolDoc } from "./types.js";

/** References beyond this are counted, not listed (see SymbolDoc.truncated). */
export const REFERENCE_CAP = 200;

export interface LspProviderSpec extends LspServerSpec {
	id: string;
	/** Lower-case, dot-led: [".rs"]. */
	extensions: string[];
	/** Workspace root sent as the initialize rootUri. */
	root: string;
	maxFiles?: number;
}

/** A DocProvider that can also say whether its server is still breathing. */
export interface LspDocProvider extends DocProvider {
	available(): boolean;
}

/** Extensions whose LSP languageId is not just the extension itself. */
const LANGUAGE_IDS: Record<string, string> = { rs: "rust", py: "python", cs: "csharp" };

function languageId(file: string): string {
	const ext = extname(file).slice(1).toLowerCase();
	return LANGUAGE_IDS[ext] ?? ext;
}

export function createLspProvider(spec: LspProviderSpec): LspDocProvider {
	const exts = new Set(spec.extensions.map((e) => e.toLowerCase()));
	const docs = createOpenDocs(spec.maxFiles ?? 50, fileToUri);
	let client: LspClient | null = null;
	let handshake: Promise<boolean> | null = null;

	/** Resolves once, ever. A false here is remembered, so nothing respawns. */
	const connect = (): Promise<boolean> => {
		handshake ??= (async () => {
			const started = startLsp(spec);
			client = started;
			const caps = await started.initialize(fileToUri(spec.root));
			return caps !== null && started.available();
		})();
		return handshake;
	};

	/** Connected, readable and in step with the disk — or null, which is "no info". */
	const ready = async (file: string): Promise<{ uri: string; text: string } | null> => {
		if (!exts.has(extname(file).toLowerCase()) || !(await connect())) return null;
		return docs.sync(file, languageId(file), client);
	};

	return {
		id: `lsp:${spec.id}`,
		available: () => client?.available() ?? true,
		supports: (file) => exts.has(extname(file).toLowerCase()),

		async docAt(file, line, col): Promise<SymbolDoc | null> {
			const doc = await ready(file);
			if (doc === null || client === null) return null;
			// The one conversion that matters: contract 1-based → LSP 0-based.
			const at = {
				textDocument: { uri: doc.uri },
				position: { line: line - 1, character: Math.max(0, col - 1) },
			};
			const [hover, definition, references, symbols] = await Promise.all([
				client.request("textDocument/hover", at),
				client.request("textDocument/definition", at),
				client.request("textDocument/references", {
					...at,
					context: { includeDeclaration: false },
				}),
				client.request("textDocument/documentSymbol", { textDocument: { uri: doc.uri } }),
			]);
			// A server that died mid-lookup leaves its unanswered requests empty, so
			// what arrived is still worth showing — but NOT as complete: a
			// `referenceCount: 0` would read as a confident "no usages" for a
			// symbol that has plenty, so `truncated` marks the answer partial.
			const died = !client.available();
			const parsed = parseHover(hover);
			const found = toLocs(references);
			const defined = toLocs(definition)[0] ?? null;
			// Nothing came back at all — a click on whitespace, or a server that was
			// already gone. Null, not a card carrying only the word this file read
			// off disk: that is not evidence any engine knows the symbol.
			const empty = parsed.signature === "" && parsed.docs === "" && defined === null;
			if (empty && found.length === 0) return null;
			const name = wordAt(doc.text, line, col);
			return {
				name,
				kind: kindAt(toOutline(symbols), name, line) ?? "symbol",
				signature: parsed.signature,
				docs: parsed.docs,
				tags: parsed.tags,
				defined,
				references: found.slice(0, REFERENCE_CAP),
				referenceCount: found.length,
				provider: "lsp",
				...(died || found.length > REFERENCE_CAP ? { truncated: true } : {}),
			};
		},

		async outline(file): Promise<OutlineItem[]> {
			const doc = await ready(file);
			if (doc === null || client === null) return [];
			const params = { textDocument: { uri: doc.uri } };
			return toOutline(await client.request("textDocument/documentSymbol", params));
		},

		dispose(): void {
			void client?.dispose(); // shutdown is best-effort; the SIGKILL is not
		},
	};
}
