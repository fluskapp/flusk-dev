/**
 * Assembles the AnatomyReport from EXISTING exports only — config, the
 * default toolbelt, workspace layers, benchmark scores, verify detection,
 * chat-CLI detection and extension discovery. Nothing here executes anything:
 * the window describes the loop, it never runs it.
 */
import { loadConfig, loadRepoConfig } from "../../platform/config/config.js";
import { listBackends } from "../chat/detect.repository.js";
import { discoverExtensions } from "../extensions/discover.repository.js";
import { loadScores, scoresPath } from "../provider/scores.repository.js";
import { MAX_SUBAGENT_DEPTH } from "../run/agent.js";
import { taskTool } from "../tools/task.js";
import { DEFAULT_TOOLS } from "../tools/toolbelt.js";
import { detectVerifyCommands } from "../verify/detect.repository.js";
import { loadWorkspace } from "../workspace/workspace.js";
import type { AnatomyReport } from "./anatomy.types.js";

function tools(): AnatomyReport["tools"] {
	const rows = DEFAULT_TOOLS.map((t) => ({
		name: t.name,
		description: t.description,
		source: "builtin" as const,
	}));
	// The task tool is conditional — registered only below the subagent depth
	// cap — so its row says so instead of pretending it is always there.
	rows.push({
		name: taskTool.name,
		description: `${taskTool.description} Registered only below the subagent depth cap.`,
		source: "builtin" as const,
	});
	return rows;
}

function workspace(repoRoot: string): AnatomyReport["workspace"] {
	// loadWorkspace already applied the global-then-repo REPLACES-per-kind
	// precedence; what remains is labelling each surviving layer's origin.
	return loadWorkspace(repoRoot).layers.map((l) => ({
		kind: l.kind,
		scope: l.source.startsWith(repoRoot) ? ("repo" as const) : ("global" as const),
		path: l.source,
		bytes: Buffer.byteLength(l.text, "utf8"),
	}));
}

async function routing(cfg: ReturnType<typeof loadConfig>): Promise<AnatomyReport["routing"]> {
	const scores = await loadScores();
	return {
		models: Object.entries(cfg.models).map(([taskKind, m]) => {
			const ref = `${m.provider}/${m.id}`;
			return { taskKind, ref, score: scores[taskKind as keyof typeof scores]?.[ref] ?? null };
		}),
		scoresPath: scoresPath(),
	};
}

/**
 * The verifyFor precedence, labelled by which branch won. `harness` exists in
 * the vocabulary for non-flusk projects; this window describes THIS repo's
 * flusk loop, so that branch is never taken here.
 */
function verify(repoRoot: string): AnatomyReport["verify"] {
	const repoCfg = loadRepoConfig(repoRoot);
	if (repoCfg?.verify !== undefined) return { commands: [...repoCfg.verify], source: "config" };
	const commands = detectVerifyCommands(repoRoot, repoCfg);
	return { commands, source: commands.length > 0 ? "detected" : "none" };
}

/**
 * DISCOVERY ONLY, deliberately: loadExtensions() imports each file and runs
 * its setup, and a read-only report must not execute anything. Counts come
 * from the files on disk; toolNames/flows/events stay empty because knowing
 * them requires running the setup this report refuses to run.
 */
async function extensions(repoRoot: string): Promise<AnatomyReport["extensions"]> {
	const found = await discoverExtensions(repoRoot);
	if (found.length === 0) return null;
	return { count: found.length, toolNames: [], flows: 0, events: 0 };
}

export async function buildAnatomy(repoRoot: string): Promise<AnatomyReport> {
	const cfg = loadConfig(repoRoot);
	return {
		repoRoot,
		loop: {
			maxSubagentDepth: MAX_SUBAGENT_DEPTH,
			compaction: { ...cfg.compaction },
			budgets: { ...cfg.budgets },
			contextBudgetTokens: cfg.context.budgetTokens,
			memoryEnabled: cfg.memory.enabled,
		},
		tools: tools(),
		workspace: workspace(repoRoot),
		routing: await routing(cfg),
		verify: verify(repoRoot),
		backends: listBackends(cfg).map((b) => ({
			id: b.id,
			label: b.label,
			available: b.available,
			...(b.note === undefined ? {} : { note: b.note }),
		})),
		extensions: await extensions(repoRoot),
		mcp: { configured: false },
	};
}
