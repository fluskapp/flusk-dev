/**
 * How a spec becomes a run — the composition `flusk run --spec` uses, kept
 * here so run-cmd.ts stays a dispatcher and the prompt's shape is testable
 * without starting anything.
 */
import { openSpec, setSpecStatus } from "./spec-files.repository.js";
import { MODE_KIND, SPEC_DIR, type Spec, type SpecStatus } from "./spec.types.js";

export interface SpecRun {
	spec: Spec;
	/** The composed task the run is given. */
	task: string;
	/** MODE_KIND[spec.mode] — the routing kind unless --kind overrides. */
	kind: (typeof MODE_KIND)[Spec["mode"]];
}

/** Title, body, then the acceptance list as its own labelled block — the gate
 * argues against exactly these lines, so they ride in unparaphrased. */
export function specTask(spec: Spec): string {
	const acceptance =
		spec.acceptance.length === 0
			? ""
			: `\n\nAcceptance:\n${spec.acceptance.map((a) => `- ${a}`).join("\n")}`;
	return `${spec.title}\n\n${spec.body.trim()}${acceptance}`;
}

/** The spec named on the command line, resolved or refused with its reason. */
export function resolveSpecRun(repoRoot: string, name: string): SpecRun {
	const r = openSpec(repoRoot, name);
	if (!r.ok) {
		throw new Error(`spec "${name}" in ${SPEC_DIR}: ${r.why} (see: flusk spec list)`);
	}
	return { spec: r.spec, task: specTask(r.spec), kind: MODE_KIND[r.spec.mode] };
}

/** Best-effort status write: a spec file gone read-only (or hand-mangled
 * mid-run) must never kill the run whose progress it merely mirrors. */
export function markSpecStatus(repoRoot: string, name: string, status: SpecStatus): void {
	try {
		setSpecStatus(repoRoot, name, status);
	} catch {
		// the run is the record; the spec's status line is a convenience
	}
}
