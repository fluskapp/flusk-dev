/**
 * The corpus as SOURCES: one per git repo, one for ah's own sessions, one for
 * the harness journals, one for the project writing.
 *
 * index-store.ts is built around a per-source stamp — "a repo's git HEAD oid,
 * the newest mtime in a directory" — and it was being handed a single source
 * called "corpus" stamped with `floor(now / 10min)`. That is wrong in both
 * directions at once: a commit made a second ago stays invisible for up to ten
 * minutes, and every bucket rollover re-walks 1500 commits and 300 journals
 * whether anything moved or not.
 *
 * A stamp has to be cheaper than the load it guards, so HEAD is read from
 * `.git` rather than spawned (`git rev-parse` costs ~290ms per repo on this
 * machine; the file read is microseconds), and the directory sources stamp
 * themselves with the count and newest mtime of the same shallow scan their
 * loader uses — the walk is cheap, the parsing it guards is not.
 *
 * The id carries a fingerprint of the CONFIG that produced it, so a shard
 * built from one machine's project roots can never be served to another.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { AhConfig } from "../config/types.js";
import { scanArtifacts } from "../ui/artifact-scan.js";
import { resolveJournalDirs, scanJournals } from "../ui/journal-scan.js";
import { scanSessions } from "../ui/scan.js";
import type { IndexSource } from "./index-store.js";
import { gitCards } from "./source-git.js";
import { journalCards } from "./source-journals.js";
import { sessionCards } from "./source-sessions.js";
import { DOC_LIMIT, docCard, gitRoots } from "./sources.js";

/** Which config produced these cards; part of every source id. */
export function configKey(cfg: AhConfig): string {
	const shape = JSON.stringify([cfg.ui.projectDirs, cfg.ui.harnessDirs]);
	return createHash("sha256").update(shape).digest("hex").slice(0, 12);
}

/** The commit HEAD points at, without spawning git. Throws if unreadable. */
export function headOid(root: string): string {
	const git = join(root, ".git");
	const dir = statSync(git).isDirectory()
		? git
		: join(
				root,
				readFileSync(git, "utf8")
					.replace(/^gitdir:\s*/, "")
					.trim(),
			);
	const head = readFileSync(join(dir, "HEAD"), "utf8").trim();
	if (!head.startsWith("ref:")) return head;
	const ref = head.slice(4).trim();
	try {
		return readFileSync(join(dir, ref), "utf8").trim();
	} catch {
		// A packed ref: the loose file does not exist until the ref moves.
		const packed = readFileSync(join(dir, "packed-refs"), "utf8");
		const found = new RegExp(`^([0-9a-f]{40})\\s+${ref}$`, "m").exec(packed);
		return found?.[1] ?? `packed:${statSync(join(dir, "packed-refs")).mtimeMs}`;
	}
}

/** "<count>:<newest mtime>" — what changes when a directory's files change. */
const fileStamp = (files: { mtimeMs: number }[]): string =>
	`${files.length}:${files.reduce((max, f) => Math.max(max, f.mtimeMs), 0)}`;

/**
 * One source per repo and per scanner. Ordered strongest-evidence-first, the
 * same order collectCards uses, so the dedup by card id resolves identically.
 */
export function corpusSources(cfg: AhConfig): IndexSource[] {
	const key = configKey(cfg);
	const sources: IndexSource[] = gitRoots(cfg).map((root) => ({
		id: `commits:${key}:${root}`,
		stamp: () => headOid(root),
		load: () => gitCards(root),
	}));
	sources.push({
		id: `sessions:${key}`,
		stamp: () => fileStamp(scanSessions().map((s) => ({ mtimeMs: s.updatedAtMs }))),
		load: () => sessionCards(),
	});
	sources.push({
		id: `journals:${key}`,
		stamp: () =>
			`${resolveJournalDirs(cfg.ui.harnessDirs).length}/${fileStamp(scanJournals(cfg.ui.harnessDirs))}`,
		load: () => journalCards(cfg),
	});
	sources.push({
		id: `docs:${key}`,
		stamp: () => fileStamp(scanArtifacts(cfg.ui.projectDirs, DOC_LIMIT)),
		load: () => scanArtifacts(cfg.ui.projectDirs, DOC_LIMIT).map(docCard),
	});
	return sources;
}
