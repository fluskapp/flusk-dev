/**
 * The open-document set a language server answers about.
 *
 * LSP is stateful in the one way that matters here: a server answers about
 * the text it was HANDED, not about the file on disk. Sending `didOpen` once
 * and never `didChange` therefore does not degrade gracefully — after any
 * edit the server keeps describing the version-1 buffer while the provider
 * reads the symbol's name off the fresh file, so the panel shows the new
 * name with the old signature, docs, definition and usages. That is worse
 * than no answer, and the mtime-keyed cache above it believes it is fresh.
 *
 * So every open file carries the stamp of the bytes the server has, and a
 * changed stamp becomes a full-text `didChange` before the request goes out.
 * The set is a real LRU — reusing a file moves it to the end — because FIFO
 * eviction closes the document you are reading while you read it.
 */
import { readFileSync, statSync } from "node:fs";

export interface OpenDoc {
	uri: string;
	text: string;
}

interface Entry {
	uri: string;
	/** mtime:size of the bytes the server currently holds. */
	stamp: string;
	version: number;
}

/** The two notifications this module sends; the client owns the wire. */
export interface DocSink {
	didOpen(uri: string, languageId: string, text: string): void;
	notify(method: string, params: Record<string, unknown>): void;
}

function stampOf(file: string): string {
	try {
		const s = statSync(file);
		return `${s.mtimeMs}:${s.size}`;
	} catch {
		return "0";
	}
}

export interface OpenDocs {
	/** Opens or re-syncs `file`; null when it cannot be read. */
	sync(file: string, languageId: string, sink: DocSink | null): OpenDoc | null;
	/** For tests and callers that want to know what the server is holding. */
	size(): number;
}

export function createOpenDocs(maxFiles: number, toUri: (file: string) => string): OpenDocs {
	const limit = Math.max(1, maxFiles);
	const open: Entry[] = [];
	return {
		size: () => open.length,
		sync(file, languageId, sink) {
			const uri = toUri(file);
			let text: string;
			try {
				text = readFileSync(file, "utf8");
			} catch {
				return null;
			}
			const stamp = stampOf(file);
			const at = open.findIndex((o) => o.uri === uri);
			if (at !== -1) {
				const [entry] = open.splice(at, 1);
				if (entry === undefined) return { uri, text };
				open.push(entry); // touched: an LRU, not a queue
				if (entry.stamp !== stamp) {
					entry.stamp = stamp;
					entry.version += 1;
					sink?.notify("textDocument/didChange", {
						textDocument: { uri, version: entry.version },
						contentChanges: [{ text }],
					});
				}
				return { uri, text };
			}
			if (open.length >= limit) {
				const evicted = open.shift();
				if (evicted !== undefined) {
					sink?.notify("textDocument/didClose", { textDocument: { uri: evicted.uri } });
				}
			}
			sink?.didOpen(uri, languageId, text);
			open.push({ uri, stamp, version: 1 });
			return { uri, text };
		},
	};
}
