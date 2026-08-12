/**
 * The bookkeeping of a house-rules scan: what was lost, and how that is said.
 *
 * Kept apart from the source because it is the half that has to be right when
 * everything else goes wrong. Three losses look identical from the outside — an
 * unreadable file, a body clipped at the cap, a document past the cap — and all
 * three must reach the reader as a sentence rather than as silence (L2). The
 * `degraded` flag exists so `status` cannot be computed from item count alone:
 * zero items after a failed read is "failed", zero items in a repo that simply
 * has no rules is "skipped", and a reader of the report must be able to tell
 * those apart without logs (L7, invariant 18).
 */
import { FILE_MAX } from "../workspace/workspace-files.repository.js";
import { gatherDocs } from "../profile/docs.repository.js";
import type { DocEntry } from "../profile/types.js";
import {
	type HouseRuleItem,
	type RuleItemSpec,
	readRule,
	ruleItem,
} from "./source-house-rules-read.js";
import type { SourceStatus } from "./types.js";

export interface Scan {
	notes: string[];
	/** Something was lost — an unreadable file, a clip, a cap. Never silent (L2). */
	degraded: boolean;
}

export const newScan = (): Scan => ({ notes: [], degraded: false });

type Take = Omit<RuleItemSpec, "file"> & { rel: string };

/** Reads one candidate and builds its item, recording whatever was lost. */
export function take(scan: Scan, repoRoot: string, spec: Take): HouseRuleItem | undefined {
	const { rel, ...rest } = spec;
	const before = scan.notes.length;
	const file = readRule(repoRoot, rel, scan.notes);
	if (scan.notes.length > before) scan.degraded = true;
	if (file === undefined) return undefined;
	if (file.clipped) {
		scan.notes.push(
			`clipped ${rel} to the ${FILE_MAX}-character cap; its tail is not in the block`,
		);
		scan.degraded = true;
	}
	return ruleItem({ file, ...rest });
}

/**
 * kind:"rules" docs in one explicit order; gatherDocs catches its own I/O.
 * Code-unit order, not localeCompare: this order reaches the rendered block,
 * and a collation that depends on the machine's locale is a byte difference
 * between two builds of the same repo (L5).
 */
export function rulesDocs(repoRoot: string, scan: Scan): DocEntry[] {
	try {
		return gatherDocs(repoRoot)
			.filter((d) => d.kind === "rules")
			.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
	} catch (e) {
		scan.notes.push(`the document scan failed, so only root house files were read: ${String(e)}`);
		scan.degraded = true;
		return [];
	}
}

/** Empty is two different outcomes, and the note has to say which one it was. */
export function status(items: number, scan: Scan, project: string): SourceStatus {
	if (items > 0) return scan.degraded ? "partial" : "ok";
	if (scan.degraded) return "failed";
	scan.notes.push(
		`${project} has no AGENTS.md or CLAUDE.md at its root and no CONTRIBUTING/CONVENTIONS/STYLE document, so there are no house rules to quote`,
	);
	return "skipped";
}
