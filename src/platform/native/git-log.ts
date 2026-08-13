/**
 * Git history cards behind the native seam: a repo root in, HistoryCard[]
 * out, whoever answers. The PARSE moved to Rust; both implementations still
 * read the log through one `git log` subprocess with the same frozen format
 * string — moving the read itself in-process (gix) is the future upgrade.
 * The TypeScript reference answers when the prebuilt is absent, always under
 * FLUSK_NATIVE=0, and whenever the native call fails — silently.
 */
import {
	type GitCardOpts,
	gitCards,
} from "../../features/history/source-git.repository.js";
import type { HistoryCard } from "../../features/history/types.js";
import { nativeModule } from "./native.repository.js";

/** Scan-stage exports the prebuilt MAY carry; a stale binary lacks them. */
interface GitNative {
	gitLogCards?(repoRoot: string, optsJson?: string): Promise<string>;
}

export interface GitLog {
	cards(repoRoot: string, opts?: GitCardOpts): Promise<HistoryCard[]>;
	/** Which implementation is answering — surfaced in logs and tests only. */
	readonly impl: "native" | "ts";
}

export function createGitLog(): GitLog {
	const native = nativeModule() as GitNative | null;
	if (native === null || typeof native.gitLogCards !== "function") {
		return { impl: "ts", cards: async (repoRoot, opts = {}) => gitCards(repoRoot, opts) };
	}
	const logNative = native.gitLogCards.bind(native);
	return {
		impl: "native",
		cards: async (repoRoot, opts = {}) => {
			try {
				return JSON.parse(await logNative(repoRoot, JSON.stringify(opts))) as HistoryCard[];
			} catch {
				// Never let a native failure take the index down.
				return gitCards(repoRoot, opts);
			}
		},
	};
}
