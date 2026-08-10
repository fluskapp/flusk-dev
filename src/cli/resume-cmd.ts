import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createAgent } from "../agent/agent.js";
import { loadConfig } from "../config/config.js";
import { createEventBus } from "../core/events.js";
import type { RunEndReason } from "../core/types.js";
import { FakeProvider } from "../provider/fake.js";
import { hasAuth, PiAiProvider } from "../provider/pi-ai.js";
import { createHitPolicy } from "../safety/hit-policy.js";
import { SessionStore } from "../session/store.js";
import { sessionsRoot } from "../ui/scan.js";
import { attachRenderer } from "./render.js";
import { DEFAULT_TOOLS, envKeyVar, loadFakeScript } from "./run-cmd.js";

export interface ResumeCmdOpts {
	/** Session file path, or a bare session id to search the sessions dirs for. */
	ref: string;
	steer?: string;
	fake?: string;
	quiet?: boolean;
	out?: NodeJS.WritableStream;
}

/** Bare ids resolve by scanning every sessions dir for *-<id>.jsonl. */
export function resolveSessionPath(ref: string): string {
	if (ref.endsWith(".jsonl")) return ref;
	const root = sessionsRoot();
	let slugs: string[] = [];
	try {
		slugs = readdirSync(root);
	} catch {
		// missing sessions root falls through to the error below
	}
	for (const slug of slugs) {
		let files: string[] = [];
		try {
			files = readdirSync(join(root, slug));
		} catch {
			continue;
		}
		const match = files.find((f) => f.endsWith(`-${ref}.jsonl`));
		if (match !== undefined) return join(root, slug, match);
	}
	throw new Error(`no session matching "${ref}" under ${root}`);
}

/** Best-effort current branch from .git/HEAD; null when detached or not a repo. */
function currentBranch(repoRoot: string): string | null {
	try {
		const head = readFileSync(join(repoRoot, ".git", "HEAD"), "utf8").trim();
		return /^ref: refs\/heads\/(.+)$/.exec(head)?.[1] ?? null;
	} catch {
		return null;
	}
}

/**
 * `hit resume <path-or-id>` — continue an interrupted session in place: same
 * file, same model, no new isolation branch (the run's branch, if any, is
 * whatever the tree is on; a mismatch only warns).
 */
export async function resumeCmd(opts: ResumeCmdOpts): Promise<RunEndReason> {
	const out = opts.out ?? process.stdout;
	const path = resolveSessionPath(opts.ref);
	const header = SessionStore.read(path)[0];
	if (!header || header.type !== "header") throw new Error(`session file has no header: ${path}`);
	const cfg = loadConfig(header.repoRoot);
	if (opts.fake === undefined && !(await hasAuth(header.model.provider))) {
		throw new Error(
			`no credentials for provider "${header.model.provider}"; set ${envKeyVar(header.model.provider)}`,
		);
	}
	const provider =
		opts.fake !== undefined ? new FakeProvider(await loadFakeScript(opts.fake)) : new PiAiProvider();
	const branch = currentBranch(header.repoRoot);
	if (header.gitBranch !== null && branch !== header.gitBranch) {
		out.write(
			`warning: ${header.repoRoot} is on ${branch ?? "a detached HEAD"} but the session ran on ${header.gitBranch}\n`,
		);
	}
	const events = createEventBus();
	if (opts.quiet !== true) attachRenderer(events, out);
	const agent = createAgent({
		provider,
		model: header.model,
		tools: DEFAULT_TOOLS,
		task: header.task,
		repoRoot: header.repoRoot,
		policy: createHitPolicy({ config: cfg, repoRoot: header.repoRoot }),
		events,
		config: cfg,
		sessionPath: path,
		...(opts.steer !== undefined ? { steer: opts.steer } : {}),
	});
	try {
		const { reason, stats } = await agent.run();
		out.write(`${reason} · ${stats.turns} turns · $${stats.usage.costUsd.toFixed(4)} · ${path}\n`);
		return reason;
	} finally {
		agent.session.close();
	}
}
