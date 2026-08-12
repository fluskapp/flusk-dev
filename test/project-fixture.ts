/**
 * A throwaway project tree for the project-model tests: a temp "projects"
 * directory the config globs point at, plus an FLUSK_HOME for sessions. Nothing
 * here reads the developer's real home.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import type { FluskConfig } from "../src/platform/config/types.js";
import type { RunEndReason } from "../src/features/run/run.types.js";
import { Session } from "../src/features/session/session-file.repository.js";

const MODEL = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

export function write(root: string, rel: string, body: string, mtimeSec?: number): string {
	const path = join(root, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
	if (mtimeSec !== undefined) utimesSync(path, mtimeSec, mtimeSec);
	return path;
}

/**
 * A harness run journal: scalar frontmatter plus the nested stages block.
 *
 * `mtimeSec` matters: the attention rules measure "stalled" and "recent" from
 * the file's last WRITE, so a fixture that leaves the mtime at the moment the
 * test ran is describing a run that is still being appended to.
 */
export function journal(
	root: string,
	name: string,
	front: Record<string, string>,
	stages: [string, string][] = [],
	mtimeSec?: number,
): string {
	const lines = Object.entries(front).map(([k, v]) => `${k}: ${v}`);
	if (stages.length > 0) lines.push("stages:", ...stages.map(([n, v]) => `  ${n}: "${v}"`));
	const declared = Date.parse(front.date ?? "");
	const at = mtimeSec ?? (Number.isNaN(declared) ? undefined : declared / 1000);
	return write(
		root,
		join("docs", "runs", `${name}.md`),
		`---\n${lines.join("\n")}\n---\n\n# ${name}\n`,
		at,
	);
}

export interface FakeSession {
	repoRoot: string;
	task: string;
	costUsd?: number;
	reason?: RunEndReason;
	/** No stats entry at all, which the scanner reports as "running". */
	open?: boolean;
	/** mtime in epoch seconds — the feed and lastActivity sort on it. */
	atSec?: number;
}

export function session(s: FakeSession): string {
	const sess = Session.create({ task: s.task, repoRoot: s.repoRoot, model: MODEL });
	sess.appendMessage({ role: "user", content: s.task });
	if (s.open !== true) {
		sess.appendStats(
			{
				turns: 1,
				usage: { input: 1, output: 1, cacheRead: 0, costUsd: s.costUsd ?? 0 },
				startedAt: "2026-08-01T00:00:00.000Z",
			},
			s.reason ?? "completed",
		);
	}
	sess.close();
	if (s.atSec !== undefined) utimesSync(sess.path, s.atSec, s.atSec);
	return sess.path;
}

export interface Tree {
	home: string;
	work: string;
	cfg: FluskConfig;
	cleanup: () => void;
}

export function tree(): Tree {
	const home = mkdtempSync(join(tmpdir(), "flusk-proj-home-"));
	const work = mkdtempSync(join(tmpdir(), "flusk-proj-work-"));
	process.env.FLUSK_HOME = home;
	const cfg: FluskConfig = {
		...structuredClone(DEFAULT_CONFIG),
		ui: { harnessDirs: [join(work, "*", "docs", "runs")], projectDirs: [join(work, "*")] },
	};
	return {
		home,
		work,
		cfg,
		cleanup: () => {
			delete process.env.FLUSK_HOME;
			rmSync(home, { recursive: true, force: true });
			rmSync(work, { recursive: true, force: true });
		},
	};
}
