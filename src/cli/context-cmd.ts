/**
 * `ah context <task> [--repo <path>] [--budget <n>] [--json]` — the block a
 * run would be given, printed before any run is started.
 *
 * The context is assembled once at run start and never shown (src/context/
 * build.ts), so debugging a bad run has meant guessing what the agent knew.
 * This is the window: the exact bytes, what was dropped and why, and what each
 * source spent. Nothing here is a summary — a summary is the one thing that
 * cannot answer "why did it not know that".
 *
 * Read-only, like `ah index` and `ah prompt`: it builds no session, writes
 * nothing, and asking for a context is never a reason to change one.
 *
 * A missing --repo is answered, not thrown. Sources are total by contract (L7)
 * so buildContext survives a bad root and returns an empty-ish block — which
 * would be indistinguishable from a repo that genuinely has nothing to say.
 * Refusing early is what keeps those two apart.
 */
import { statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { buildContext } from "../context/build.js";
import { DEFAULT_BUDGET } from "../ui/api-history.js";
import { contextJson, renderContext } from "./context-report.js";

export interface ContextArgs {
	repo?: string | undefined;
	budget?: string | undefined;
	json?: boolean | undefined;
	out?: NodeJS.WritableStream;
}

/** The resolved root, or null when there is no directory there to read. */
function repoRoot(repo: string): string | null {
	try {
		return statSync(repo).isDirectory() ? repo : null;
	} catch {
		return null;
	}
}

/** `ah context <task> [--repo path] [--budget n] [--json]`. */
export function contextCmd(task: string, args: ContextArgs = {}): number {
	const out = args.out ?? process.stdout;
	// `ah context … | head` closes the pipe mid-write; that is the reader's
	// choice, not a failure worth a stack trace.
	out.on("error", () => {});
	const budget = args.budget === undefined ? DEFAULT_BUDGET : Number(args.budget);
	if (!Number.isInteger(budget) || budget <= 0) {
		out.write("ah: --budget must be a positive integer\n");
		return 1;
	}
	const asked = resolve(args.repo ?? process.cwd());
	const root = repoRoot(asked);
	if (root === null) {
		out.write(`ah: --repo is not a readable directory: ${asked}\n`);
		return 1;
	}
	// isResume is false: this is the block a FRESH run starts from. A resume
	// rebuilds against a moved tree and its own journal, which is a different
	// question and would need the session it is resuming.
	const built = buildContext({ task, repoRoot: root, budgetTokens: budget, isResume: false });
	// Project-relative, like `ah index`: an absolute root in the output leaks
	// $HOME into anything the reader pastes.
	const where = relative(process.cwd(), root) || ".";
	if (args.json === true) {
		out.write(`${JSON.stringify(contextJson(built, task, where), null, 2)}\n`);
		return 0;
	}
	out.write(renderContext(built, task, where));
	return 0;
}
