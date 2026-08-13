/**
 * The runs feature's typed server functions: the unified run feed, one
 * session's transcript, one journal's meta and rendered body, and "reveal in
 * Finder". Bodies delegate to the same modules the legacy HTTP handlers used
 * (run-feed.ts, detail.ts, journal-scan, sessions.router's validation rules),
 * so the two surfaces cannot drift while both exist.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { join, resolve } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import { renderMarkdown } from "../../ui/render/markdown.js";
import { scanArtifacts } from "./artifact-scan.repository.js";
import { loadSessionDetail, type SessionDetail } from "./detail.js";
import { readTextSync } from "./file-read.repository.js";
import { expandHome, type Journal, scanJournals } from "./journal-scan.repository.js";
import type { RunRow } from "./projects.types.js";
import { revealInFinder } from "./reveal.repository.js";
import { runFeed } from "./run-feed.js";
import { scanSessions, sessionsRoot, type SessionSummary } from "./scan.repository.js";

export type { RunRow } from "./projects.types.js";
export type { SessionDetail, ToolView, TranscriptItem } from "./detail.js";
export type { Journal, JournalStage } from "./journal-scan.repository.js";
export type { SessionSummary } from "./scan.repository.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** Same shape rule as sessions.router.ts: the key IS the path, so it is closed. */
const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+\.jsonl$/;

/** null when the key is malformed or escapes the sessions root. */
const keyToPath = createServerOnlyFn((key: string): string | null => {
	if (!KEY_RE.test(key)) return null;
	const root = resolve(sessionsRoot());
	const path = resolve(join(root, key));
	return path.startsWith(`${root}/`) ? path : null;
});

/**
 * Identity against the scanner's index, not a prefix test — the exact
 * membership rule content.router.ts documents: a symlink under docs/runs that
 * resolves elsewhere still *starts with* the root, so prefix admits it.
 */
const indexedJournal = createServerOnlyFn((target: string): Journal | null => {
	if (target === "") return null;
	const path = resolve(expandHome(target));
	return scanJournals(cfg().ui.harnessDirs).find((j) => j.path === path) ?? null;
});

/** The unified feed: flusk sessions and harness journals, newest first. */
export const getRunFeed = createServerFn()
	.inputValidator((data: { project?: string; limit?: number }) => data)
	.handler(async ({ data }): Promise<RunRow[]> => runFeed(cfg(), data));

/** The light half of a session run: enough for the header, no transcript. */
export interface RunHead {
	summary: SessionSummary | null;
	path: string | null;
}

export const getRunHead = createServerFn()
	.inputValidator((data: { key: string }) => data)
	.handler(async ({ data }): Promise<RunHead> => {
		return {
			summary: scanSessions().find((s) => s.key === data.key) ?? null,
			path: keyToPath(data.key),
		};
	});

export type SessionRun = SessionDetail & { path: string };

/** The heavy half: the whole transcript. Deferred by the route loader. */
export const getSessionRun = createServerFn()
	.inputValidator((data: { key: string }) => data)
	.handler(async ({ data }): Promise<SessionRun> => {
		const path = keyToPath(data.key);
		if (path === null) throw new Error("bad session key");
		return { ...loadSessionDetail(path), path };
	});

/** One journal's frontmatter — title, status, stages, PR — never the body. */
export const getJournalMeta = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<Journal | null> => indexedJournal(data.path));

export interface JournalBody {
	text: string;
	html: string;
}

/**
 * The journal body, rendered on the server: escaping is the renderer's
 * security invariant and a second client-side implementation would be a
 * second place to get it wrong.
 */
export const getJournalBody = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<JournalBody> => {
		const found = indexedJournal(data.path);
		if (found === null) throw new Error("not an indexed journal");
		const text = readTextSync(found.path);
		return { text, html: renderMarkdown(text) };
	});

/**
 * Reveal spawns `open -R`, so the set of acceptable paths is CLOSED: a
 * session key resolves under the sessions root, anything else must be a path
 * one of the scanners already indexed. Same rule as sessions.router.ts.
 */
export const revealRef = createServerFn({ method: "POST" })
	.inputValidator((data: { key?: string; path?: string }) => data)
	.handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
		let path: string | null = null;
		if (data.key !== undefined) path = keyToPath(data.key);
		else if (data.path !== undefined && data.path !== "") {
			const target = resolve(expandHome(data.path));
			const c = cfg();
			const indexed = [
				...scanJournals(c.ui.harnessDirs).map((j) => j.path),
				...scanArtifacts(c.ui.projectDirs).map((a) => a.path),
			];
			path = indexed.includes(target) ? target : null;
		}
		if (path === null) return { ok: false, error: "not a revealable file" };
		if (process.platform !== "darwin") return { ok: false, error: "reveal is macOS-only" };
		revealInFinder(path);
		return { ok: true };
	});
