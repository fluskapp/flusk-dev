/**
 * An agent's name is also its FILENAME (`<name>.md`), so this is the file
 * that keeps a synthesised name from becoming a path. Everything a model or a
 * cloned repo proposes goes through `safeAgentName`, which can only ever emit
 * `[a-z0-9]` and single dashes — no dot, no slash, no `..`, no leading dash.
 *
 * A name that fails the pattern is a load issue, never a name normalised on
 * the fly: the handle the caller types must be the handle on disk, or an
 * invocation silently runs a different agent than the one that was read.
 */
import { queryTerms } from "../history/tokenize.js";

export const AGENT_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Longer than this and the name stops being a handle anyone types. */
const MAX_WORDS = 4;
const MAX_LEN = 40;

export function isValidAgentName(name: string): boolean {
	return name.length > 0 && name.length <= 64 && AGENT_NAME.test(name);
}

/** Coerces arbitrary text into a valid name, or "" when nothing survives. */
export function safeAgentName(raw: string): string {
	const name = raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_LEN)
		.replace(/-+$/g, "");
	return isValidAgentName(name) ? name : "";
}

/**
 * A name derived from the TASK, so the file the user opens afterwards is
 * recognisable. Stopwords are dropped by the shared tokenizer, which is why
 * "write vitest tests for the parser" becomes "write-vitest-tests-parser".
 */
export function deriveAgentName(task: string): string {
	const words = queryTerms(task).slice(0, MAX_WORDS);
	return safeAgentName(words.join("-")) || "generated-agent";
}

/** `base`, or `base-2`, `base-3`… — the first form no existing spec claims. */
export function uniqueAgentName(base: string, taken: ReadonlySet<string>): string {
	const seed = safeAgentName(base) || "generated-agent";
	if (!taken.has(seed)) return seed;
	for (let n = 2; n < 1000; n++) {
		const candidate = `${seed}-${n}`;
		if (!taken.has(candidate)) return candidate;
	}
	return `${seed}-${Date.now()}`;
}
