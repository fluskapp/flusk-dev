/**
 * The three scaffolds `flusk spec new` writes. Each is a COMPLETE example
 * spec: the frontmatter is real, the body teaches the format by being one,
 * and every acceptance line is something the verification gate could argue
 * against — "works" and "clean" are not on the list.
 */
import type { SpecTemplate } from "./spec.types.js";

const fm = (title: string, mode: string, acceptance: string[]): string =>
	[
		"---",
		`title: ${title}`,
		"status: draft",
		`mode: ${mode}`,
		"acceptance:",
		...acceptance.map((a) => `  - ${a}`),
		"---",
		"",
	].join("\n");

const feature = (title: string): string =>
	fm(title, "build", [
		"the new behavior is reachable from the CLI and named in --help",
		"a test drives the happy path end to end and passes",
		"every existing test passes unchanged",
	]) +
	`
## Context

What exists today and why it is not enough. Name the files a reader
should open first — a spec that makes the agent hunt spends its budget
on discovery instead of the change.

## Constraints

- Public flags, on-disk formats and module seams that must not change.
- Anything the diff must NOT touch.

## Sketch

The shape of the change, not the diff: which module grows, which seam
the new code goes through, what the new test will assert.
`;

const bugfix = (title: string): string =>
	fm(title, "build", [
		"a new test reproduces the failure and passes after the fix",
		"no existing test was edited to make the suite pass",
	]) +
	`
## Symptom

What happens, verbatim: the command typed, the output seen. A symptom
retold in your own words hides the detail that matters.

## Expected

What should have happened instead, and which document or test says so.

## Suspects

Files and functions to read first, and why each one is suspect.
`;

const refactor = (title: string): string =>
	fm(title, "refactor", [
		"the full test suite passes with no test file edited",
		"the old location of the moved code is deleted, not re-exported",
	]) +
	`
## Why

What the current shape costs: the change that was hard, the file over
the size cap, the seam that leaks.

## Target shape

Where each piece lands. Name the modules that appear and the ones that
disappear.

## Off limits

Behavior, public surfaces and formats this refactor must not change —
the gate holds the acceptance list against exactly this.
`;

const BODIES: Record<SpecTemplate, (title: string) => string> = { feature, bugfix, refactor };

/** The full file content for `flusk spec new <name> --template <t>`. */
export function renderSpecTemplate(template: SpecTemplate, name: string): string {
	return BODIES[template](name.replace(/[-_]+/g, " "));
}
