/**
 * Chat conversations under ~/.flusk/chats/, one append-only JSONL file each,
 * fsynced per entry (the session-store idiom): a crash loses at most the entry
 * being written.
 *
 * Read/supersede rule: entries replay in order; a "turn" with seq S discards
 * every "partial" with seq S (the partial was that turn's in-flight snapshot);
 * a trailing partial with no matching turn surfaces as an assistant turn
 * marked partial:true, in the position it streamed at. A torn FINAL line is
 * dropped; a malformed interior line throws with its line number.
 *
 * FLUSK_HOME overrides the root — that is the whole test seam.
 */
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { fluskHome } from "../../platform/paths/paths.js";
import type { ChatConversation, ChatLogEntry, ChatTurnRecord } from "./types.js";

export function chatsDir(): string {
	return join(fluskHome(), "chats");
}

/** "<compact-iso>-<uuid8>": ids sort chronologically, like session filenames. */
export function newConversationId(now: Date = new Date()): string {
	const compactIso = now.toISOString().replace(/[:.]/g, "-");
	return `${compactIso}-${randomUUID().slice(0, 8)}`;
}

const pathOf = (id: string): string => join(chatsDir(), `${id}.jsonl`);

export interface ChatLog {
	append(e: ChatLogEntry): void;
	close(): void;
}

/** Creates dir and file, appending the header iff the file is new. */
export function openChatLog(id: string): ChatLog {
	mkdirSync(chatsDir(), { recursive: true });
	const fresh = !existsSync(pathOf(id));
	const fd = openSync(pathOf(id), "a");
	const append = (e: ChatLogEntry): void => {
		writeSync(fd, `${JSON.stringify(e)}\n`);
		fsyncSync(fd);
	};
	if (fresh) append({ type: "header", version: 1, id, createdAt: new Date().toISOString() });
	return { append, close: () => closeSync(fd) };
}

function readEntries(path: string): ChatLogEntry[] {
	if (!existsSync(path)) return [];
	const lines = readFileSync(path, "utf8").split("\n");
	let last = -1;
	for (let i = 0; i < lines.length; i++) if ((lines[i] ?? "").trim() !== "") last = i;
	const entries: ChatLogEntry[] = [];
	for (let i = 0; i <= last; i++) {
		const line = lines[i];
		if (line === undefined || line.trim() === "") continue;
		try {
			entries.push(JSON.parse(line) as ChatLogEntry);
		} catch {
			if (i === last) break; // torn final append from a crash
			throw new Error(`Malformed chat entry at line ${i + 1} in ${path}`);
		}
	}
	return entries;
}

/** 1 + the highest seq recorded in <id>.jsonl; 0 for a new conversation. */
export function nextSeq(id: string): number {
	let max = -1;
	for (const e of readEntries(pathOf(id))) {
		if ((e.type === "turn" || e.type === "partial") && e.seq > max) max = e.seq;
	}
	return max + 1;
}

export function readConversation(id: string): ChatConversation {
	const turns: ChatTurnRecord[] = [];
	const partialAt = new Map<number, number>();
	const turned = new Set<number>();
	for (const e of readEntries(pathOf(id))) {
		if (e.type === "turn") {
			turned.add(e.seq);
			const at = partialAt.get(e.seq);
			if (at !== undefined) {
				turns[at] = e.turn;
				partialAt.delete(e.seq);
			} else turns.push(e.turn);
		} else if (e.type === "partial" && !turned.has(e.seq)) {
			const record: ChatTurnRecord = { role: "assistant", content: e.text, at: e.at, partial: true };
			const at = partialAt.get(e.seq);
			if (at !== undefined) turns[at] = record;
			else {
				partialAt.set(e.seq, turns.length);
				turns.push(record);
			}
		}
	}
	return { id, turns };
}

/** Lexicographic max of *.jsonl basenames — the names sort chronologically. */
export function latestConversationId(): string | null {
	let names: string[];
	try {
		names = readdirSync(chatsDir());
	} catch {
		return null;
	}
	const ids = names.filter((n) => n.endsWith(".jsonl")).map((n) => n.slice(0, -".jsonl".length));
	ids.sort();
	return ids.at(-1) ?? null;
}
