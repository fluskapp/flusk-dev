/**
 * What a run knows before its first turn, and where those bytes end up.
 *
 * src/context/build.ts assembles the block — house rules, the verify chain the
 * run will be judged by, what the history and the last run say about these
 * files — and until this file nothing called it. Three decisions come with the
 * call, and each one is a trap if reversed:
 *
 * ONCE PER RUN. buildContext runs here, at run start and again on a resume,
 * and the result is frozen into the system prompt the loop carries for every
 * turn (L6). The next reader will be tempted to refresh it mid-run so the
 * agent "sees" its own edits: do not. A prompt cache is worthless once its
 * prefix moves, and a context that changes under a conversation leaves the
 * model's earlier reasoning pointing at text that is no longer there. The
 * agent sees its edits with its tools, which is what tools are for.
 *
 * NEVER FATAL. A repo with no git, no profile and no recorded runs is the
 * normal case, not an error: sources degrade to a note (L7). The assembler is
 * wrapped anyway, so the day a source breaks its own no-throw contract it
 * costs the block and not the run — and the failure is reported rather than
 * swallowed.
 *
 * NO SECOND COPY. buildSystemPrompt renders AGENTS.md / CLAUDE.md verbatim and
 * the house-rules source pins the same files; whichever one carries them, the
 * other must not. Two copies double the tokens and hand the model two framings
 * of one rule to reconcile. So the prompt drops exactly the house files the
 * block ended up quoting — and when the block is disabled, failed, or dropped
 * them for budget, the prompt keeps them. The rules survive every failure
 * mode of this file, which is why the check is on `included` and not on what
 * was merely gathered.
 */
import { basename } from "node:path";
import type { AhConfig } from "../config/types.js";
import { buildContext } from "../context/build.js";
import { HOUSE_RULES_SOURCE } from "../context/source-house-rules-read.js";
import { defaultSources } from "../context/sources.js";
import type { BuiltContext, ContextSource } from "../context/types.js";
import type { EventBus } from "../core/events.js";
import type { ModelRef } from "../core/types.js";
import { announceContext, announceFailure } from "./run-context-event.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { HOUSE_FILES, loadWorkspace, type WorkspaceLayers } from "./workspace.js";

export interface RunContextInput {
	repoRoot: string;
	task: string;
	model: ModelRef;
	/** True for a resumed session AND for a resume-in-place (continueRun). */
	isResume: boolean;
	events: EventBus;
	context: AhConfig["context"];
	/** The session this run writes; the runs source reads it on a resume. */
	sessionRef: string;
	/** Injected by tests. Production takes the six registered sources. */
	sources?: readonly ContextSource[];
}

/** The two per-run products: the prompt the loop sends, and its own report. */
export interface RunPrompt {
	baseSystem: string;
	announce: () => Promise<void>;
}

const silent = async (): Promise<void> => {};

/** loadWorkspace is documented never to throw; a run with no system prompt at
 * all would be a dead run, so the promise is not taken on trust. */
function workspaceOf(repoRoot: string): WorkspaceLayers {
	try {
		return loadWorkspace(repoRoot);
	} catch {
		return { layers: [], notes: [] };
	}
}

/** The block, or the message explaining why there is none. Never throws. */
function build(input: RunContextInput, ws: WorkspaceLayers): BuiltContext | string {
	try {
		return buildContext(
			{
				task: input.task,
				repoRoot: input.repoRoot,
				budgetTokens: input.context.budgetTokens,
				isResume: input.isResume,
			},
			{
				sources:
					input.sources ??
					// `loaded` keeps the run to one read of the workspace files, so the
					// prompt and the block cannot disagree about what they say.
					defaultSources({ sessionRef: input.sessionRef, workspace: { loaded: ws } }),
			},
		);
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	}
}

/** House files the block actually quotes; the prompt must not print them again. */
function quotedHouseFiles(built: BuiltContext): Set<string> {
	const files = new Set<string>();
	for (const item of built.included) {
		if (item.source !== HOUSE_RULES_SOURCE || item.path === undefined) continue;
		if ((HOUSE_FILES as readonly string[]).includes(item.path)) files.add(item.path);
	}
	return files;
}

/** Every layer except the house files the block has taken over. */
function without(ws: WorkspaceLayers, taken: ReadonlySet<string>): WorkspaceLayers {
	if (taken.size === 0) return ws;
	return {
		...ws,
		layers: ws.layers.filter((l) => l.kind !== "house" || !taken.has(basename(l.source))),
	};
}

/** After the env block: the prompt is the agent's own instructions, and the
 * block is quoted material that must not sit above them. */
const append = (system: string, block: string): string =>
	block === "" ? system : `${system}\n\n${block}`;

export function prepareRun(input: RunContextInput): RunPrompt {
	const ws = workspaceOf(input.repoRoot);
	const prompt = (layers: WorkspaceLayers): string =>
		buildSystemPrompt({
			repoRoot: input.repoRoot,
			cwd: input.repoRoot,
			model: input.model,
			workspace: layers,
		});
	if (!input.context.enabled) return { baseSystem: prompt(ws), announce: silent };
	const built = build(input, ws);
	if (typeof built === "string") {
		const note = built;
		return {
			baseSystem: prompt(ws),
			announce: () => announceFailure(input.events, input.context.budgetTokens, note),
		};
	}
	return {
		baseSystem: append(prompt(without(ws, quotedHouseFiles(built))), built.text),
		announce: () => announceContext(input.events, built),
	};
}
