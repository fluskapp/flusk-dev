/**
 * The workspace ContextSource: flusk's own markdown layers, pinned.
 *
 * A run is already told its identity, its hard constraints and its tool
 * guidance by src/agent/system-prompt.ts, which calls loadWorkspace itself.
 * THAT IS THE TRAP THIS FILE EXISTS TO AVOID: emitting the same three files
 * into the context block as well doubles their tokens and hands the model two
 * copies of one rule to reconcile. So the default is to suppress exactly the
 * kinds buildSystemPrompt renders — all three of them, today — and to say so in
 * a note rather than silently. A caller that builds a system prompt WITHOUT the
 * workspace passes `alsoInSystemPrompt: []` and gets the pinned items instead.
 *
 * `house` is never emitted here whatever the options: AGENTS.md / CLAUDE.md
 * belong to the house-rules source, and two sources emitting one file is the
 * same doubling by another route.
 *
 * Cost: at most six readFileSync calls, no walk, no spawn, no network. ENOENT
 * is the normal case and is silent. Redaction already happened inside
 * readLayerText, so nothing here scrubs a second time (L4).
 */
import { basename } from "node:path";
import {
	type LayerKind,
	loadWorkspace,
	type WorkspaceLayer,
	type WorkspaceLayers,
} from "../workspace/workspace.js";
import { KIND_RANK, toItem, wasSealed } from "./source-workspace-item.js";
import { GLOBAL_LABEL, relativiseNote } from "./source-workspace-paths.js";
import type { ContextRequest, ContextSource, SourceResult, SourceStatus } from "./types.js";

export const WORKSPACE_SOURCE_ID = "workspace";

/** The kinds this source owns. `house` is the house-rules source's. */
const OWNED = ["identity", "soul", "tools"] as const;
type OwnedKind = (typeof OWNED)[number];
type OwnedLayer = WorkspaceLayer & { kind: OwnedKind };

const FILES: Record<OwnedKind, string> = {
	identity: "IDENTITY.md",
	soul: "SOUL.md",
	tools: "TOOLS.md",
};

const isOwned = (l: WorkspaceLayer): l is OwnedLayer =>
	(OWNED as readonly LayerKind[]).includes(l.kind);

export interface WorkspaceSourceOptions {
	/**
	 * The layers the system prompt already loaded. Passing them keeps the run to
	 * one read of these files; omitting them re-reads, which is what a resume
	 * wants when SOUL.md changed under it (L6).
	 */
	loaded?: WorkspaceLayers;
	/**
	 * Kinds already rendered verbatim by buildSystemPrompt. Defaults to all
	 * three, which is what it does today; `[]` says the caller took them out.
	 */
	alsoInSystemPrompt?: readonly LayerKind[];
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Every note the workspace loader raised about a file THIS source would have
 * emitted, verbatim apart from having its absolute paths relativised. Notes
 * about house files are dropped: this source never intended to read them, so
 * they say nothing about how completely it read what it did (invariant 18).
 */
function ownedNotes(notes: readonly string[], repoRoot: string): string[] {
	const names = OWNED.map((k) => FILES[k]);
	return notes
		.filter((n) => names.some((f) => n.includes(f)))
		.map((n) => relativiseNote(n, repoRoot));
}

/** Reads once, catching everything: an unreadable workspace is not a dead run (L7). */
function read(req: ContextRequest, opts: WorkspaceSourceOptions): WorkspaceLayers | string {
	try {
		return opts.loaded ?? loadWorkspace(req.repoRoot);
	} catch (e) {
		return errText(e);
	}
}

/**
 * The task is deliberately unused: these items are pinned, so none of them is
 * selected against the task text, and `isResume` changes nothing either — a
 * resume re-reads the same files and produces the same bytes (L5, L16).
 */
function gather(req: ContextRequest, opts: WorkspaceSourceOptions): SourceResult {
	const ws = read(req, opts);
	if (typeof ws === "string")
		return { items: [], status: "failed", notes: [`workspace could not be read: ${ws}`] };

	const degraded = ownedNotes(ws.notes, req.repoRoot);
	const notes = [...degraded];
	const suppress = opts.alsoInSystemPrompt ?? OWNED;
	const owned = ws.layers.filter(isOwned);
	const house = ws.layers.filter((l) => l.kind === "house").length;
	if (house > 0)
		notes.push(
			`${house} house-rules file(s) loaded with the workspace are left to the house-rules source; a copy here would double them.`,
		);

	const kept = owned.filter((l) => !suppress.includes(l.kind));
	const dropped = owned.filter((l) => suppress.includes(l.kind));
	if (dropped.length > 0)
		notes.push(
			`${dropped.map((l) => FILES[l.kind]).join(", ")} already rendered verbatim in the system prompt by buildSystemPrompt; not repeated here, which would have doubled those tokens.`,
		);
	for (const l of kept)
		if (wasSealed(l.text))
			notes.push(
				`the quoting sentinel inside ${FILES[l.kind]} was spaced out so gathered text cannot close the quotation early.`,
			);
	if (owned.length === 0)
		notes.push(
			`no IDENTITY.md, SOUL.md or TOOLS.md under ${GLOBAL_LABEL} or ${basename(req.repoRoot)}/.flusk/workspace: this run has no flusk identity, hard-constraint or tool-guidance layer.`,
		);

	// Explicit total order with `id` as the final tie-break, so adding an
	// unrelated file can never permute the items already here (L5, invariant 14).
	const items = kept
		.map((l) => ({ rank: KIND_RANK[l.kind], item: toItem(l, req.repoRoot) }))
		.sort((a, b) => a.rank - b.rank || cmp(a.item.id, b.item.id))
		.map((p) => p.item);

	const status: SourceStatus =
		items.length === 0 ? "skipped" : degraded.length > 0 ? "partial" : "ok";
	return { items, status, notes };
}

/** The registered source. `gather` is total: it never throws (L7). */
export function createWorkspaceSource(opts: WorkspaceSourceOptions = {}): ContextSource {
	return {
		id: WORKSPACE_SOURCE_ID,
		label: "Workspace layers",
		gather: (req) => gather(req, opts),
	};
}
