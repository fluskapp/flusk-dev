/** The runs feature's typed server functions: the unified run feed, one
 * session's transcript and summary, one journal's meta and rendered body, and
 * "reveal in Finder". Bodies delegate to the modules the legacy HTTP handlers
 * used, so the two surfaces cannot drift while both exist. */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { join, resolve } from "node:path";
import { resolveSessionPath } from "../../cli/resume-cmd.js";
import { loadConfig } from "../../platform/config/config.js";
import { summarizeSession, type RunSummary } from "../run/summary.js";
import { createRenderer } from "./native.repository.js";
import { scanArtifacts } from "./artifact-scan.repository.js";
import { loadSessionDetail } from "./detail.js";
import { readTextSync } from "./file-read.repository.js";
import { journalAt } from "./journal-lookup.repository.js";
import { expandHome, type Journal } from "./journal-scan.repository.js";
import type { RunRow } from "./projects.types.js";
import { revealInFinder } from "./reveal.repository.js";
import { runFeed } from "./run-feed.js";
import type { JournalBody, RunHead, SessionRun } from "./runs.types.js";
import { lastGate } from "../session/gate-fold.js";
import { SessionStore } from "../session/session.repository.js";
import { scanSessions, sessionsRoot } from "./scan.repository.js";

export type { RunRow } from "./projects.types.js";
export type { Journal, JournalStage } from "./journal-scan.repository.js";
export type { SessionSummary } from "./scan.repository.js";
export type { RunSummary } from "../run/summary.js";
export type { Json, JournalBody, RunHead, SessionRun, ToolView, TranscriptItem } from "./runs.types.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));
const renderer = createRenderer();

/** Same shape rule as sessions.router.ts: the key IS the path, so it is closed. */
const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+\.jsonl$/;

/** null when the key is malformed or escapes the sessions root. */
const keyToPath = createServerOnlyFn((key: string): string | null => {
	if (!KEY_RE.test(key)) return null;
	const root = resolve(sessionsRoot());
	const path = resolve(join(root, key));
	return path.startsWith(`${root}/`) ? path : null;
});

/** Directory containment, not index membership: journalAt realpaths the
 * target and requires its parent to be a configured journal dir's realpath —
 * a symlink under docs/runs that resolves elsewhere is still refused, and a
 * journal past the feed's per-dir cap still renders. */
const journalRef = createServerOnlyFn((target: string): Journal | null =>
	journalAt(cfg().ui.harnessDirs, target),
);

/** The unified feed: flusk sessions and harness journals, newest first. */
export const getRunFeed = createServerFn()
	.inputValidator((data: { project?: string; limit?: number }) => data)
	.handler(async ({ data }): Promise<RunRow[]> => runFeed(cfg(), data));

/** The light half of a session run: enough for the header, no transcript. */
export const getRunHead = createServerFn()
	.inputValidator((data: { key: string }) => data)
	.handler(async ({ data }): Promise<RunHead> => ({
		summary: scanSessions().find((s) => s.key === data.key) ?? null,
		path: keyToPath(data.key),
	}));

/** The heavy half: the whole transcript. Deferred by the route loader.
 * `harnessVerified` (additive, external-harness sessions only): the last gate
 * decision passed at least one verify command — the trust chip's fact. */
export const getSessionRun = createServerFn()
	.inputValidator((data: { key: string }) => data)
	.handler(async ({ data }): Promise<SessionRun & { harnessVerified?: boolean }> => {
		const path = keyToPath(data.key);
		if (path === null) throw new Error("bad session key");
		const detail = { ...loadSessionDetail(path), path } as SessionRun;
		if (detail.header.harness === undefined) return detail;
		const gate = lastGate(SessionStore.read(path));
		return { ...detail, harnessVerified: gate !== null && gate.verified.length > 0 };
	});

/** The Summary block's facts — session entries + gate rows, every field
 * harness-observed (summary.ts). Keys resolve under the sessions root, other
 * refs through explain's resolver; null when no session is behind the ref. */
export const getRunSummary = createServerFn()
	.inputValidator((data: { ref: string }) => data)
	.handler(async ({ data }): Promise<RunSummary | null> => {
		try {
			return await summarizeSession(keyToPath(data.ref) ?? resolveSessionPath(data.ref));
		} catch {
			return null;
		}
	});

/** One journal's frontmatter — title, status, stages, PR — never the body. */
export const getJournalMeta = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<Journal | null> => journalRef(data.path));

/** The journal body, rendered on the server: escaping is the renderer's
 * security invariant; a second client-side implementation would be a second
 * place to get it wrong. */
export const getJournalBody = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<JournalBody> => {
		const found = journalRef(data.path);
		if (found === null) throw new Error("not a journal in a configured harness directory");
		const text = readTextSync(found.path);
		return { text, html: await renderer.markdown(text) };
	});

/** Reveal spawns `open -R`, so the set of acceptable paths is CLOSED: a
 * session key resolves under the sessions root, a journal must sit in a
 * configured journal directory (containment — the cap must not make a real
 * journal unrevealable), and anything else must be an indexed artifact. */
export const revealRef = createServerFn({ method: "POST" })
	.inputValidator((data: { key?: string; path?: string }) => data)
	.handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
		let path: string | null = null;
		if (data.key !== undefined) path = keyToPath(data.key);
		else if (data.path !== undefined && data.path !== "") {
			const target = resolve(expandHome(data.path));
			const c = cfg();
			const allowed =
				journalAt(c.ui.harnessDirs, target) !== null ||
				scanArtifacts(c.ui.projectDirs).some((a) => a.path === target);
			path = allowed ? target : null;
		}
		if (path === null) return { ok: false, error: "not a revealable file" };
		if (process.platform !== "darwin") return { ok: false, error: "reveal is macOS-only" };
		revealInFinder(path);
		return { ok: true };
	});
