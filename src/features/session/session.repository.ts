import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionEntry } from "./entries.js";

/**
 * Append-only JSONL file handle. Every append is fsynced so a crash
 * mid-run loses at most the entry being written, never a synced one.
 */
export class SessionStore {
	private constructor(
		private readonly fd: number,
		readonly path: string,
	) {}

	static open(path: string): SessionStore {
		mkdirSync(dirname(path), { recursive: true });
		return new SessionStore(openSync(path, "a"), path);
	}

	appendEntry(entry: SessionEntry): void {
		writeSync(this.fd, `${JSON.stringify(entry)}\n`);
		fsyncSync(this.fd);
	}

	close(): void {
		closeSync(this.fd);
	}

	/**
	 * Parse a session file; malformed interior lines throw with their 1-based
	 * line number. A malformed FINAL line is dropped: it is the torn tail of an
	 * append interrupted by a crash, which the fsync-per-entry design promises
	 * to survive by losing at most that entry.
	 */
	static read(path: string): SessionEntry[] {
		const lines = readFileSync(path, "utf8").split("\n");
		let lastContent = -1;
		for (let i = 0; i < lines.length; i++) {
			if ((lines[i] ?? "").trim() !== "") lastContent = i;
		}
		const entries: SessionEntry[] = [];
		for (let i = 0; i <= lastContent; i++) {
			const line = lines[i];
			if (line === undefined || line.trim() === "") continue;
			try {
				entries.push(JSON.parse(line) as SessionEntry);
			} catch {
				if (i === lastContent) break; // torn final append from a crash
				throw new Error(`Malformed session entry at line ${i + 1} in ${path}`);
			}
		}
		return entries;
	}
}
