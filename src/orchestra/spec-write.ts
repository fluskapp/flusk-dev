/**
 * Writing one generated spec into `<repo>/.flusk/agents/<name>.md`.
 *
 * The name is the FILENAME, so it is re-validated here even though the draft
 * already sanitised it — this is the last point before a string becomes a
 * path, and `resolveWithin` then proves the result is inside the repo jail
 * rather than trusting that check. One jail, the existing one; a second
 * implementation of "is this inside the project" is how the first one gets
 * bypassed.
 *
 * It never overwrites: the whole promise of generating a file is that the
 * user can edit it afterwards, and a creation step that clobbers an edited
 * agent breaks that promise silently. `wx` makes the refusal atomic, so two
 * concurrent creations cannot both believe they won.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveWithin } from "../safety/paths.js";
import type { SpecDraft } from "./spec-draft.js";
import { isValidAgentName } from "./spec-name.js";
import { renderAgentSpec } from "./spec-render.js";

export type SpecWrite = { ok: true; path: string } | { ok: false; error: string };

/** Never throws: writing to disk is talking to the outside world. */
export function writeAgentSpec(repoRoot: string, draft: SpecDraft): SpecWrite {
	if (!isValidAgentName(draft.name)) {
		return { ok: false, error: `refusing unsafe agent name "${draft.name}"` };
	}
	let path: string;
	try {
		path = resolveWithin([repoRoot], join(".flusk", "agents", `${draft.name}.md`), repoRoot);
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
	try {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, renderAgentSpec(draft), { encoding: "utf8", flag: "wx" });
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		return { ok: false, error: `cannot write ${path}: ${detail}` };
	}
	return { ok: true, path };
}
