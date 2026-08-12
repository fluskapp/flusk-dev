/**
 * The agents flusk ships with, so `flusk` can delegate on a machine where nobody
 * has written a spec yet — an empty registry makes the orchestrator look
 * broken rather than unconfigured.
 *
 * They are code, not files, because `tsc` emits `.js` and would leave shipped
 * `.md` behind in dist. `source` is therefore this module's own absolute
 * path: honest (the spec really did come from here), stable across reloads,
 * and outside every scannable directory so no file can claim to be one.
 *
 * All three are `worker: "internal"` on purpose — a builtin must not name a
 * binary or a backend, so a fresh install delegates on the provider the
 * parent run already has.
 */
import { fileURLToPath } from "node:url";
import type { AgentSpec } from "./types.js";

const SOURCE = fileURLToPath(import.meta.url);

function builtin(name: string, description: string, prompt: string): AgentSpec {
	return { name, description, worker: "internal", prompt, source: SOURCE, scope: "builtin" };
}

/**
 * Descriptions state WHEN, not what: this field is the only thing the router
 * matches a task against, so "Writes vitest tests" beats "testing expert".
 */
export const BUILTIN_SPECS: readonly AgentSpec[] = [
	builtin(
		"test-writer",
		"Use when a module has no tests and needs vitest tests written for its public behaviour",
		"You write vitest tests for one module.\n\n" +
			"Read the module and its neighbours first, mirror the test style already in the " +
			"repository, and cover the behaviour a caller depends on rather than the private " +
			"shape of the implementation. Do not change the module under test. Report the test " +
			"file you wrote and how you ran it.",
	),
	builtin(
		"code-reviewer",
		"Use to review a diff or a file for correctness, security and repository-convention bugs",
		"You review code that someone else just wrote.\n\n" +
			"Read the change in full before judging any part of it. Report only defects you can " +
			"name a concrete failing input for, each with file, line and the failure it causes. " +
			"Say nothing about style the repository does not already enforce. Change no files.",
	),
	builtin(
		"codebase-explorer",
		"Use to find where something lives or how a subsystem works before changing it",
		"You answer one question about an unfamiliar codebase.\n\n" +
			"Search before reading and read before concluding. Answer with absolute file paths " +
			"and the specific functions involved, name what you did not verify, and change no " +
			"files.",
	),
];
