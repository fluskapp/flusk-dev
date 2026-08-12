/**
 * The one place the corpus is assembled: commits, flusk's own sessions, harness
 * run journals, and the project's own writing.
 *
 * Fanning out here rather than at each call site is what keeps the mix
 * honest. The answer to "how do I do this here" is usually split across all
 * four — a commit shows the change, a journal shows whether the gate accepted
 * it, a session shows what was actually run, and CLAUDE.md says why none of
 * them may be copied verbatim. A caller that assembled its own subset would
 * quietly re-introduce code search.
 *
 * Ids are the dedup key, so a project reachable through two configured globs
 * contributes its cards once. First writer wins: the sources are ordered
 * strongest-evidence-first, and a later duplicate has nothing to add.
 */
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { FluskConfig } from "../../platform/config/types.js";
import { HEAD_BYTES, readHead } from "../projects/artifact-meta.repository.js";
import { type Artifact, resolveProjectRoots, scanArtifacts } from "../projects/artifact-scan.repository.js";
import { capText, dropPartialTail } from "./cap.js";
import { redact } from "../../platform/logger/scrub.js";
import { type GitCardOpts, gitCards } from "./source-git.repository.js";
import { journalCards } from "./source-journals.js";
import { sessionCards } from "./source-sessions.js";
import type { HistoryCard } from "./types.js";

/** Well past the real corpus (~390 files), so nothing is silently dropped. */
export const DOC_LIMIT = 1200;
const TEXT_CAP = 4000;

export interface CollectOptions {
	git?: GitCardOpts;
	docLimit?: number;
}

/** Project roots that are actually repositories — a worktree's `.git` is a file. */
export function gitRoots(cfg: FluskConfig): string[] {
	return resolveProjectRoots(cfg.ui.projectDirs).filter((root) => existsSync(join(root, ".git")));
}

/**
 * Docs and skills. The head is enough: a convention that is not stated in the
 * first few KB of the file is not a convention anyone reads either, and
 * indexing whole documents would let one long design doc outweigh the repo.
 */
export function docCard(a: Artifact): HistoryCard {
	const root = resolve(a.root);
	const abs = resolve(a.path);
	const rel = abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : basename(abs);
	const kind = a.kind === "skill" ? "skill" : "doc";
	// `readHead` stops on a BYTE boundary, so a file longer than the head can
	// come back ending mid-word — and a multibyte head is under TEXT_CAP in
	// characters, so the cap below would never notice.
	const raw = readHead(a.path);
	const head = Buffer.byteLength(raw, "utf8") >= HEAD_BYTES ? dropPartialTail(raw) : raw;
	return {
		id: `${kind}:${a.project}:${rel}`,
		kind,
		project: a.project,
		title: redact(a.title),
		text: capText(redact(head === "" ? a.title : `${a.title}\n\n${head}`), TEXT_CAP),
		at: new Date(a.mtimeMs).toISOString(),
		paths: [rel],
		outcome: "unknown",
		ref: a.path,
	};
}

/**
 * Every card the configured projects can offer, de-duplicated by id. A source
 * that throws is skipped rather than fatal: one unreadable repo must not cost
 * the index its other three thousand cards.
 */
export function collectCards(cfg: FluskConfig, opts: CollectOptions = {}): HistoryCard[] {
	const byId = new Map<string, HistoryCard>();
	const absorb = (load: () => HistoryCard[]): void => {
		let cards: HistoryCard[] = [];
		try {
			cards = load();
		} catch {
			return;
		}
		for (const card of cards) if (!byId.has(card.id)) byId.set(card.id, card);
	};
	for (const root of gitRoots(cfg)) absorb(() => gitCards(root, opts.git ?? {}));
	absorb(() => sessionCards());
	absorb(() => journalCards(cfg));
	absorb(() => scanArtifacts(cfg.ui.projectDirs, opts.docLimit ?? DOC_LIMIT).map(docCard));
	return [...byId.values()];
}
