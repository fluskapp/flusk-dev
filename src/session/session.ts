import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelRef, Msg, RunEndReason, RunStats } from "../core/types.js";
import {
	type CompactionEntry,
	type HeaderEntry,
	type MessageEntry,
	SESSION_VERSION,
	type SessionEntry,
	type StatsEntry,
} from "./entries.js";
import { newSessionPath } from "./paths.js";
import { SessionStore } from "./store.js";

export interface CreateSessionOpts {
	task: string;
	repoRoot: string;
	model: ModelRef;
	parentSession?: string;
	taskKind?: string;
	now?: Date;
}

/** Best-effort branch from .git/HEAD; null when detached or not a repo. */
function detectGitBranch(repoRoot: string): string | null {
	try {
		const head = readFileSync(join(repoRoot, ".git", "HEAD"), "utf8").trim();
		const match = head.match(/^ref: refs\/heads\/(.+)$/);
		return match?.[1] ?? null;
	} catch {
		return null;
	}
}

export class Session {
	private nextId: number;

	private constructor(
		private readonly store: SessionStore,
		private readonly headerEntry: HeaderEntry,
		private readonly allEntries: SessionEntry[],
	) {
		let maxId = 0;
		for (const e of allEntries) {
			if (e.type !== "header" && e.id > maxId) maxId = e.id;
		}
		this.nextId = maxId + 1;
	}

	static create(opts: CreateSessionOpts): Session {
		const now = opts.now ?? new Date();
		const id = randomUUID().slice(0, 8);
		const header: HeaderEntry = {
			type: "header",
			version: SESSION_VERSION,
			id,
			task: opts.task,
			repoRoot: opts.repoRoot,
			gitBranch: detectGitBranch(opts.repoRoot),
			model: opts.model,
			createdAt: now.toISOString(),
			...(opts.parentSession !== undefined ? { parentSession: opts.parentSession } : {}),
			...(opts.taskKind !== undefined ? { taskKind: opts.taskKind } : {}),
		};
		const store = SessionStore.open(newSessionPath(opts.repoRoot, id, now));
		store.appendEntry(header);
		return new Session(store, header, [header]);
	}

	static load(path: string): Session {
		const entries = SessionStore.read(path);
		const header = entries[0];
		if (!header || header.type !== "header") {
			throw new Error(`Session file has no header entry: ${path}`);
		}
		if (header.version !== SESSION_VERSION) {
			throw new Error(
				`Session version mismatch in ${path}: file has ${header.version}, expected ${SESSION_VERSION}`,
			);
		}
		return new Session(SessionStore.open(path), header, entries);
	}

	private append<E extends SessionEntry>(entry: E): E {
		this.store.appendEntry(entry);
		this.allEntries.push(entry);
		return entry;
	}

	appendMessage(msg: Msg): MessageEntry {
		return this.append<MessageEntry>({ type: "message", id: this.nextId++, msg });
	}

	appendCompaction(opts: {
		summary: string;
		firstKeptEntryId: number;
		tokensBefore: number;
	}): CompactionEntry {
		return this.append<CompactionEntry>({ type: "compaction", id: this.nextId++, ...opts });
	}

	appendStats(stats: RunStats, reason?: RunEndReason): StatsEntry {
		return this.append<StatsEntry>({
			type: "stats",
			id: this.nextId++,
			stats,
			...(reason !== undefined ? { reason } : {}),
		});
	}

	/** Replay context; honors the most recent compaction entry if present. */
	buildContext(): Msg[] {
		const messages = this.allEntries.filter((e): e is MessageEntry => e.type === "message");
		let compaction: CompactionEntry | undefined;
		for (const e of this.allEntries) {
			if (e.type === "compaction") compaction = e;
		}
		if (!compaction) return messages.map((e) => e.msg);
		const kept = compaction.firstKeptEntryId;
		return [
			{ role: "user", content: `Summary of earlier work:\n${compaction.summary}` },
			...messages.filter((e) => e.id >= kept).map((e) => e.msg),
		];
	}

	// biome-ignore format: trivial accessors kept compact
	get id(): string { return this.headerEntry.id; }
	get path(): string {
		return this.store.path;
	}
	get header(): HeaderEntry {
		return { ...this.headerEntry };
	}
	get entries(): SessionEntry[] {
		return [...this.allEntries];
	}
	close(): void {
		this.store.close();
	}
}
