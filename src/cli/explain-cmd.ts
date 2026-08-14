/**
 * `flusk explain <path-or-id>` — the run's account of itself, printed for the
 * reviewer who asks "why did it do that": which model and chosen how, what
 * context it was given (and what was dropped, per source), how it was
 * isolated, and what the gate proved. Every line names its evidence — a
 * decision entry written when the decision was made, or a fact of record.
 */
import { SessionStore } from "../features/session/session.repository.js";
import { assembleFromSession, type DecisionLog, gateEvidence } from "../features/run/decisions.js";
import { createFactStore } from "../features/facts/facts.repository.js";
import { resolveNamespace } from "../features/facts/namespaces.js";
import { loadConfig, loadRepoConfig } from "../platform/config/config.js";
import { resolveSessionPath } from "./resume-cmd.js";
import { renderDecisionLog } from "./explain-render.js";

export interface ExplainCmdOpts {
	ref: string;
	json?: boolean;
	out?: NodeJS.WritableStream;
}

/** Assembles the log for a session ref; exported for the app's server surface.
 * A pure read — no lock is taken, so explaining a LIVE run is safe. */
export async function explainSession(path: string): Promise<DecisionLog> {
	const entries = SessionStore.read(path);
	const header = entries[0];
	if (header?.type !== "header") throw new Error(`not a session file: ${path}`);
	const log = assembleFromSession(
		{
			id: header.id,
			task: header.task,
			createdAt: header.createdAt,
			...(header.taskKind !== undefined ? { taskKind: header.taskKind } : {}),
		},
		entries,
	);
	// The gate's rows live in the repo's namespace; memory disabled means no
	// rows, and the log says so rather than inventing a verdict.
	const cfg = loadConfig(header.repoRoot);
	if (!cfg.memory.enabled) return log;
	const ns = resolveNamespace(header.repoRoot, loadRepoConfig(header.repoRoot));
	return { ...log, gate: await gateEvidence(createFactStore(), ns, header.id) };
}

export async function explainCmd(opts: ExplainCmdOpts): Promise<number> {
	const out = opts.out ?? process.stdout;
	let log: DecisionLog;
	try {
		log = await explainSession(resolveSessionPath(opts.ref));
	} catch (e) {
		out.write(`flusk: ${e instanceof Error ? e.message : String(e)}\n`);
		return 1;
	}
	out.write(opts.json === true ? `${JSON.stringify(log, null, 2)}\n` : renderDecisionLog(log));
	return 0;
}
